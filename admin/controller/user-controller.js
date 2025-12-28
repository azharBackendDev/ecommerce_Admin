import User from '../model/user.model.js';

export const registerUser = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Basic validation
        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, and password are required"
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this email already exists"
            });
        }

        // Create user (addresses/sellerInfo empty by default)
        const newUser = await User.create({
            fullName,
            email,
            password
        });

        // Response: Hide password, show basic info
        const { password: _, ...userResponse } = newUser.toObject();

        res.status(201).json({
            success: true,
            message: "User registered successfully. Please verify your email.",
            user: userResponse
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};



// POST /api/users/:userId/address – Add new address
export const addAddress = async (req, res) => {
  try {
    const { userId } = req.params; // Or req.user._id if auth
    const addressData = req.body; // { fullName, phone, addressLine1, ... }

    // Basic validation
    const requiredFields = ["fullName", "phone", "addressLine1", "city", "state", "pincode", "country"];
    for (const field of requiredFields) {
      if (!addressData[field]) {
        return res.status(400).json({ 
          success: false, 
          message: `${field} is required` 
        });
      }
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // If isDefault: Set others to false
    if (addressData.isDefault) {
      user.addresses.forEach(addr => (addr.isDefault = false));
    }

    // Add new address (Mongoose auto-generates _id)
    const newAddress = { ...addressData };
    user.addresses.push(newAddress);

    // Save
    await user.save();

    // Response: Updated addresses array
    res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses
    });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error while adding address" 
    });
  }
};

// PUT /api/users/:userId/address/:addressId – Update existing address
export const updateAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const updateData = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    // Update fields
    Object.assign(address, updateData);

    // Handle isDefault
    if (updateData.isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== addressId) addr.isDefault = false;
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      addresses: user.addresses
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ success: false, message: "Server error while updating address" });
  }
};

// DELETE /api/users/:userId/address/:addressId – Remove address
export const deleteAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    // If deleting default, set another as default (first one)
    if (address.isDefault && user.addresses.length > 1) {
      user.addresses[0].isDefault = true;
    }

    // Remove
    address.remove();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      addresses: user.addresses
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ success: false, message: "Server error while deleting address" });
  }
};