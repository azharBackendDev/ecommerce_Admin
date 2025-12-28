const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // admin, customer, moderator
    permissions: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model("Role", roleSchema);
