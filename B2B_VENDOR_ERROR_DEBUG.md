# B2B Vendor System - Error Debugging Guide

## Common 500 Errors and Solutions

### 1. Razorpay Configuration Error
**Error**: "Razorpay not configured" or "Payment gateway is not configured"

**Solution**: 
- Check if `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `backend/.env`
- Ensure keys start with `rzp_` prefix
- Restart the server after adding keys

### 2. Invalid Subscription Plan
**Error**: "Subscription plan not found" or "Invalid subscription plan ID"

**Solution**:
- Ensure B2B subscription plans exist in database
- Check if plan ID is valid MongoDB ObjectId
- Verify plan is active (`isActive: true`)

### 3. Database Transaction Error
**Error**: "Failed to register B2B vendor" or validation errors

**Solution**:
- Check MongoDB connection
- Verify all required fields are provided
- Check server logs for detailed error messages

### 4. Missing Required Fields
**Error**: Validation errors

**Required Fields for B2B Registration**:
- name, email, phone, password, storeName
- businessTypes (array with at least 1 item)
- subscriptionPlan (valid plan ID)
- documents: panCard, businessLicense (base64)
- address: street, city, state, pincode

## Testing Endpoints

### Initialize Payment
```
POST /api/auth/b2b-vendor/initialize-payment
Body: { subscriptionPlan: "plan_id_here" }
```

### Register with Payment
```
POST /api/auth/b2b-vendor/register-with-payment
Body: {
  name, email, phone, password, storeName,
  businessTypes: ["Manufacturer"],
  subscriptionPlan: "plan_id",
  paymentData: {
    razorpayOrderId, razorpayPaymentId, razorpaySignature
  }
}
```

## Check Server Logs

The error handler middleware logs detailed error information including:
- Error message
- Stack trace
- Request URL and method
- Request body (first 200 chars)

Check your server console for these logs to identify the exact issue.
