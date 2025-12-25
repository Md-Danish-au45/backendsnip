
import Service from '../models/Service.js';
import PricingPlan from '../models/PricingModel.js';
import { uploadToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../utils/cloudinary.js';

// @desc    Get all ACTIVE services for frontend display
// @route   GET /api/services
// @access  Public
export const getAllServices = async (req, res, next) => {
  try {
    const services = await Service.find({ is_active: true });
    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single service by its ID
// @route   GET /api/services/:id
// @access  Public
export const getServiceById = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      res.status(404);
      throw new Error('Service not found with that ID');
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Create a new service
// @route   POST /api/services
// @access  Private (Admin Only)

export const createService = async (req, res, next) => {
  try {
    // When using multipart/form-data, req.body contains the text fields
    const serviceData = req.body;

    if (serviceData.api_price && typeof serviceData.api_price === 'string') {
  serviceData.api_price = JSON.parse(serviceData.api_price);
}
if (updateData.api_price && typeof updateData.api_price === 'string') {
  updateData.api_price = JSON.parse(updateData.api_price);
}


    // Since FormData sends all values as strings, we need to parse the nested JSON fields.
    if (serviceData.combo_price && typeof serviceData.combo_price === 'string') {
        serviceData.combo_price = JSON.parse(serviceData.combo_price);
    }
    if (serviceData.inputFields && typeof serviceData.inputFields === 'string') {
        serviceData.inputFields = JSON.parse(serviceData.inputFields);
    }
    if (serviceData.outputFields && typeof serviceData.outputFields === 'string') {
        serviceData.outputFields = JSON.parse(serviceData.outputFields);
    }
    
    // Handle image upload if a file is present in the request
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, 'services');
      serviceData.imageUrl = result.secure_url;
    }

    const createdService = await Service.create(serviceData);

    // Automatically add the new service to Professional and Enterprise plans
    // For Personal plan, only add if there's already a service with the same subcategory
    try {
      const allPlans = await PricingPlan.find({ 
        name: { $in: ['Personal', 'Professional', 'Enterprise'] } 
      }).populate('includedServices', 'subcategory');
      
      const updatePromises = [];
      
      for (const plan of allPlans) {
        let shouldAddService = false;
        
        if (plan.name === 'Professional' || plan.name === 'Enterprise') {
          // Always add to Professional and Enterprise plans
          shouldAddService = true;
        } else if (plan.name === 'Personal') {
          // For Personal plan, only add if there's already a service with the same subcategory
          if (createdService.subcategory) {
            const hasMatchingSubcategory = plan.includedServices.some(
              service => service.subcategory === createdService.subcategory
            );
            shouldAddService = hasMatchingSubcategory;
          }
        }
        
        if (shouldAddService) {
          // Check if service is already included (though it shouldn't be since it's new)
          const isServiceAlreadyIncluded = plan.includedServices.some(
            service => service._id.toString() === createdService._id.toString()
          );
          
          if (!isServiceAlreadyIncluded) {
            plan.includedServices.push(createdService._id);
            updatePromises.push(plan.save());
          }
        }
      }
      
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log(`Service '${createdService.service_key}' automatically added to ${updatePromises.length} pricing plans.`);
      }
    } catch (planUpdateError) {
      console.error('Error adding service to pricing plans:', planUpdateError);
      // Don't fail the entire request if plan update fails, just log the error
    }

    res.status(201).json({
      success: true,
      message: 'Service created successfully and added to applicable pricing plans',
      data: createdService,
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Update an existing service by its ID
// @route   PUT /api/services/:id
// @access  Private (Admin Only)
export const updateServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = req.body;

    // 👇 Fix: Parse nested objects if sent as JSON strings
    if (updateData.combo_price && typeof updateData.combo_price === 'string') {
      updateData.combo_price = JSON.parse(updateData.combo_price);
    }
    if (updateData.api_price && typeof updateData.api_price === 'string') {
      updateData.api_price = JSON.parse(updateData.api_price);
    }
    if (updateData.inputFields && typeof updateData.inputFields === 'string') {
      updateData.inputFields = JSON.parse(updateData.inputFields);
    }
    if (updateData.outputFields && typeof updateData.outputFields === 'string') {
      updateData.outputFields = JSON.parse(updateData.outputFields);
    }

    // 👇 Handle new image upload if provided
    if (req.file) {
      const result = await uploadImageToCloudinary(req.file.path);
      updateData.imageUrl = result.secure_url;
    }

    // 👇 Perform update
    const updatedService = await Service.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.status(200).json({
      message: 'Service updated successfully',
      data: updatedService,
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      message: 'Failed to update service',
      error: error.message,
    });
  }
};

// @desc    Delete a service by its ID
// @route   DELETE /api/services/:id
// @access  Private (Admin Only)
export const deleteServiceById = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id); 

    if (!service) {
      res.status(404);
      throw new Error('Service not found with that ID');
    }

    //  delete image from Cloudinary when deleting the service
    if (service.imageUrl) {
        try {
            const publicId = getPublicIdFromUrl(service.imageUrl);
            await deleteFromCloudinary(publicId);
        } catch (cloudinaryError) {
            console.error("Failed to delete image from Cloudinary during service deletion:", cloudinaryError);
        }
    }

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Manually update all services to set a default combo price.
 * @route   PUT /api/services/admin/manual-update
 * @access  Private/Admin
 */
export const manualUpdate = async (req, res, next) => {
  try {
    const updatePayload = {
      $set: {
        combo_price: {
          monthly: 60000,
          yearly: 40000,
        },
      },
    };

    const result = await Service.updateMany({}, updatePayload);

    if (result.modifiedCount === 0 && result.matchedCount > 0) {
        return res.status(200).json({
            success: true,
            message: "All services already had the correct combo prices set. No documents were modified.",
            data: result,
        });
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated combo prices for ${result.modifiedCount} services.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllServices = async (req, res, next) => {
  try {
    // Note: This does not delete associated images from Cloudinary.
    const result = await Service.deleteMany({});
    res.status(200).json({
      message: 'All services deleted successfully. Cloudinary images were not removed.',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
};



// @desc    Create multiple new services
// @route   POST /api/services/bulk
// @access  Private (Admin Only)
export const createMultipleServices = async (req, res, next) => {
  try {
    const servicesData = req.body; // Expect an array of service objects


    // Validate that servicesData is an array
    if (!Array.isArray(servicesData)) {
      res.status(400);
      throw new Error('Request body must be an array of service objects.');
    }

    const createdServices = [];
    const errors = [];

    for (const serviceData of servicesData) {
      try {
        // Parse nested JSON fields if they are strings (e.g., from FormData or if sent as stringified JSON)
        if (serviceData.combo_price && typeof serviceData.combo_price === 'string') {
            serviceData.combo_price = JSON.parse(serviceData.combo_price);
        }
        if (serviceData.inputFields && typeof serviceData.inputFields === 'string') {
            serviceData.inputFields = JSON.parse(serviceData.inputFields);
        }
        if (serviceData.outputFields && typeof serviceData.outputFields === 'string') {
            serviceData.outputFields = JSON.parse(serviceData.outputFields);
        }
        
      
        const createdService = await Service.create(serviceData);
        createdServices.push(createdService);
      } catch (error) {
        errors.push({ serviceData, error: error.message });
      }
    }

    if (createdServices.length > 0) {
      res.status(201).json({
        success: true,
        message: `${createdServices.length} services created successfully.`,
        data: createdServices,
        failed: errors.length > 0 ? errors : undefined,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No services were created. Check the provided data.',
        failed: errors,
      });
    }

  } catch (error) {
    next(error);
  }
};