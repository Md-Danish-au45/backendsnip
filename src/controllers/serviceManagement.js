
import Service from '../models/Service.js';

// @desc    Create a new service
// @route   POST /api/admin/services
// @access  Private/Admin

export const createService = async (req, res, next) => {
  try {
    const { name, description, imageUrl, price, discount } = req.body;

    // Check if a service with the same name already exists
    const serviceExists = await Service.findOne({ name });
    if (serviceExists) {
      res.status(400);
      throw new Error('A service with this name already exists');
    }

    const service = await Service.create({
      name,
      description,
      imageUrl,
      price,
      discount,
    });

    res.status(201).json({
      success: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing service
// @route   PUT /api/admin/services/:serviceId
// @access  Private/Admin
export const updateService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.serviceId);

    if (!service) {
      res.status(404);
      throw new Error('Service not found');
    }

    // Update fields only if they are provided in the request body
    service.name = req.body.name || service.name;
    service.description = req.body.description || service.description;
    service.imageUrl = req.body.imageUrl || service.imageUrl;
    service.price = req.body.price ?? service.price; // Use ?? to allow setting price to 0
    
    // For discount, allow setting it or unsetting it by passing null
    if (req.body.discount !== undefined) {
      service.discount = req.body.discount;
    }

    const updatedService = await service.save();

    res.status(200).json({
      success: true,
      data: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a service
// @route   DELETE /api/admin/services/:serviceId
// @access  Private/Admin
export const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.serviceId);

    if (!service) {
      res.status(404);
      throw new Error('Service not found');
    }

    await service.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Service has been deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};