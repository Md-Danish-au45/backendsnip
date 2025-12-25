export const checkActive = async (req, res, next) => {
  try {
    if (req.user && req.user.isBusinessUser && !req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Please complete GSTIN consent and agreement to access this feature",
        requiresConsent: !req.user.gstinConsentGiven,
        requiresAgreement: !req.user.agreementSigned
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};