const providerVerified = (req, res, next) => {
  if (req.user.role !== "provider") {
    return res.status(403).json({
      success: false,
      message: "Provider access only",
    });
  }

  if (req.user.verificationStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: "Provider not verified by admin",
    });
  }

  next();
};

export default providerVerified;