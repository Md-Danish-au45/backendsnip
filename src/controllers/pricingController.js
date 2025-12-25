import PricingPlan from '../models/PricingModel.js';
import Service from '../models/Service.js';
import asyncHandler from 'express-async-handler';

/**
 * @desc    Add a new pricing plan
 * @route   POST /api/pricing
 * @access  Private/Admin
 */
const addPricingPlan = asyncHandler(async (req, res) => {
  const { name, monthly, yearly, monthStartDate, includedServices: serviceKeys } = req.body;

  if (!name || !monthly || !yearly || !monthStartDate || !Array.isArray(serviceKeys)) {
    res.status(400);
    throw new Error('Please provide all required fields for the pricing plan.');
  }

  const planExists = await PricingPlan.findOne({ name });
  if (planExists) {
    res.status(400);
    throw new Error(`A pricing plan with the name '${name}' already exists.`);
  }

  const services = await Service.find({ 'service_key': { $in: serviceKeys } });
  if (services.length !== serviceKeys.length) {
    res.status(400);
    throw new Error('One or more of the included service keys are invalid.');
  }
  const serviceIds = services.map(service => service._id);

  const pricingPlan = new PricingPlan({
    name,
    monthly,
    yearly,
    monthStartDate,
    includedServices: serviceIds,
  });

  const createdPlan = await pricingPlan.save();
  res.status(201).json(createdPlan);
});

/**
 * @desc    Update an existing pricing plan
 * @route   PUT /api/pricing/:id
 * @access  Private/Admin
 */
const updatePricingPlan = asyncHandler(async (req, res) => {
  const { name, monthly, yearly, monthStartDate, includedServices: serviceKeys } = req.body;

  const pricingPlan = await PricingPlan.findById(req.params.id);

  if (!pricingPlan) {
    res.status(404);
    throw new Error('Pricing plan not found.');
  }

  let serviceIds;
  if (serviceKeys && Array.isArray(serviceKeys)) {
    const services = await Service.find({ 'service_key': { $in: serviceKeys } });
    if (services.length !== serviceKeys.length) {
      res.status(400);
      throw new Error('One or more of the included service keys are invalid.');
    }
    serviceIds = services.map(service => service._id);
  }

  pricingPlan.name = name || pricingPlan.name;
  pricingPlan.monthly = monthly || pricingPlan.monthly;
  pricingPlan.yearly = yearly || pricingPlan.yearly;
  pricingPlan.monthStartDate = monthStartDate || pricingPlan.monthStartDate;
  pricingPlan.includedServices = serviceIds || pricingPlan.includedServices;

  const updatedPlan = await pricingPlan.save();
  res.status(200).json(updatedPlan);
});

/**
 * @desc    Delete a pricing plan
 * @route   DELETE /api/pricing/:id
 * @access  Private/Admin
 */
const deletePricingPlan = asyncHandler(async (req, res) => {
  const pricingPlan = await PricingPlan.findByIdAndDelete(req.params.id);

  if (pricingPlan) {
    // await pricingPlan.remove();
    res.status(200).json({ message: 'Pricing plan has been removed.' });
  } else {
    res.status(404);
    throw new Error('Pricing plan not found.');
  }
});

/**
 * @desc    Get all pricing plans
 * @route   GET /api/pricing
 * @access  Public
 */
const getAllPricingPlans = asyncHandler(async (req, res) => {
  const plans = await PricingPlan.find({}).populate('includedServices', 'name service_key');
  res.status(200).json(plans);
});


/**
 * @desc    Add multiple new pricing plans in a single batch
 * @route   POST /api/pricing/bulk
 * @access  Private/Admin
 */
const addMultiplePricingPlans = asyncHandler(async (req, res) => {
  const plans = req.body;

  if (!Array.isArray(plans) || plans.length === 0) {
    res.status(400);
    throw new Error('Request body must be a non-empty array of pricing plans.');
  }

  const planNames = plans.map(p => p.name);
  
  // Check for duplicate names within the input array
  if (new Set(planNames).size !== planNames.length) {
    res.status(400);
    throw new Error('The provided array contains duplicate plan names.');
  }

  // Check if any of these plans already exist in the database
  const existingPlans = await PricingPlan.find({ name: { $in: planNames } }).select('name');
  if (existingPlans.length > 0) {
    res.status(400);
    throw new Error(`The following pricing plans already exist: ${existingPlans.map(p => p.name).join(', ')}`);
  }

  // Collect all unique service keys from all plans for a single DB query
  const allServiceKeys = [...new Set(plans.flatMap(p => p.includedServices))];
  
  // Find all corresponding services and create a map for quick lookup
  const foundServices = await Service.find({ service_key: { $in: allServiceKeys } }).select('service_key _id');
  const serviceKeyToIdMap = new Map(foundServices.map(s => [s.service_key, s._id]));

  const plansToCreate = [];
  const invalidServiceKeys = new Set();

  // Prepare the data for insertion
  for (const plan of plans) {
    const serviceIds = [];
    for (const key of plan.includedServices) {
      if (serviceKeyToIdMap.has(key)) {
        serviceIds.push(serviceKeyToIdMap.get(key));
      } else {
        invalidServiceKeys.add(key);
      }
    }

    // Only proceed if all service keys for this plan are valid
    if (invalidServiceKeys.size === 0) {
        plansToCreate.push({
            ...plan,
            includedServices: serviceIds,
        });
    }
  }
  
  if (invalidServiceKeys.size > 0) {
    res.status(400);
    throw new Error(`The following service keys are invalid or do not exist: ${[...invalidServiceKeys].join(', ')}`);
  }

  const createdPlans = await PricingPlan.insertMany(plansToCreate);
  res.status(201).json({
    message: `Successfully created ${createdPlans.length} pricing plans.`,
    data: createdPlans,
  });
});
const updateLimits = async () => {
  try {

    //  Define the plans that should NOT be updated.
    const excludedPlans = ['Personal', 'Professional', 'Enterprise'];

    //  Define the filter to find all plans NOT in the exclusion list.
    const filter = {
      name: { $nin: excludedPlans },
    };

    //  Define the update operation using an aggregation pipeline.
    
    const updateOperation = [
      {
        $set: {
          // Set the monthly limit to the size of the 'includedServices' array.
          'monthly.limitPerMonth': { $size: '$includedServices' },
          // Set the yearly limit to the same size.
          'yearly.limitPerMonth': { $size: '$includedServices' },
        },
      },
    ];

    //  Execute the update for all matching documents.
    const result = await PricingPlan.updateMany(filter, updateOperation);

  
    
  } catch (error) {
    console.error('An error occurred during the update process:');
    console.error(error);
  } 
};

export const syncSubcategoriesInPlans = asyncHandler(async (req, res, next) => {
    // Define the names of the plans 
    const planNamesToUpdate = ["Personal", "Professional", "Enterprise"];

    //. Fetch the target pricing plans and all services in one go.
    const [plans, allServices] = await Promise.all([
        PricingPlan.find({ name: { $in: planNamesToUpdate } }).populate('includedServices', 'subcategory'),
        Service.find({ subcategory: { $ne: null, $ne: '' } }).select('_id subcategory') // Get all services with a subcategory
    ]);

    if (!plans || plans.length === 0) {
        res.status(404);
        throw new Error('Could not find the specified pricing plans (Personal, Professional, Enterprise).');
    }

    const updatedPlans = [];

    for (const plan of plans) {
        //  Create a set of all unique subcategories present in the plan's current services.
        const subcategoriesInPlan = new Set();
        plan.includedServices.forEach(service => {
            if (service.subcategory) {
                subcategoriesInPlan.add(service.subcategory);
            }
        });
        
        if (subcategoriesInPlan.size === 0) {
            // If no services with subcategories exist in this plan, skip to the next one.
            continue;
        }

        //  Find all service IDs that belong to these identified subcategories.
        const serviceIdsToAdd = allServices
            .filter(service => subcategoriesInPlan.has(service.subcategory))
            .map(service => service._id);

        //  Create a new set of unique service IDs for the plan.
        const currentServiceIds = plan.includedServices.map(s => s._id.toString());
        const allServiceIdsForPlan = new Set([...currentServiceIds, ...serviceIdsToAdd.map(id => id.toString())]);
        
        // Update the plan's includedServices list.
        plan.includedServices = Array.from(allServiceIdsForPlan);
        
        // Save the updated plan and add the promise to an array.
        updatedPlans.push(plan.save());
    }

    // Wait for all plans to be saved.
    await Promise.all(updatedPlans);

    res.status(200).json({
        success: true,
        message: `${updatedPlans.length} pricing plan(s) were successfully synchronized with their subcategories.`,
    });
});

/**
 * @desc    Add service to pricing plan using service key
 * @route   POST /api/pricing/add-service
 * @access  Private/Admin
 */
const addServiceToPlan = asyncHandler(async (req, res) => {
  const { planName, serviceKey } = req.body;

  if (!planName || !serviceKey) {
    res.status(400);
    throw new Error('Please provide both plan name and service key.');
  }

  // Find the pricing plan by name
  const plan = await PricingPlan.findOne({ name: planName });
  if (!plan) {
    res.status(404);
    throw new Error(`Pricing plan with name '${planName}' not found.`);
  }

  // Find the service by service key
  const service = await Service.findOne({ service_key: serviceKey });
  if (!service) {
    res.status(404);
    throw new Error(`Service with key '${serviceKey}' not found.`);
  }

  // Check if service is already included in the plan
  const isServiceAlreadyIncluded = plan.includedServices.some(
    serviceId => serviceId.toString() === service._id.toString()
  );

  if (isServiceAlreadyIncluded) {
    res.status(400);
    throw new Error(`Service '${serviceKey}' is already included in plan '${planName}'.`);
  }

  // Add service to the plan
  plan.includedServices.push(service._id);
  await plan.save();

  res.status(200).json({
    success: true,
    message: `Service '${serviceKey}' successfully added to plan '${planName}'.`,
    data: {
      planName: plan.name,
      serviceAdded: {
        serviceKey: service.service_key,
        serviceName: service.name,
        serviceId: service._id
      },
      totalServicesInPlan: plan.includedServices.length
    }
  });
});


export {
  addPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  getAllPricingPlans,
  addMultiplePricingPlans,
  updateLimits,
  addServiceToPlan
};
