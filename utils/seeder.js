const User = require("../models/User");
const mongoose = require("mongoose");

const seedAdmin = async () => {
  try {
    console.log("Seeding admin user...");
    // Check if admin already exists
    const adminExists = await User.findOne({ email: "admin@gmail.com" });

    if (adminExists) {
      console.log(
        "Admin user already exists - updating password for admin:",
        adminExists.email
      );
      // Update the admin's password
      adminExists.password = "@#Ramram123";
      await adminExists.save();
      console.log("Admin password updated successfully");
      return {
        success: true,
        message: "Admin already exists, password updated",
        user: adminExists,
      };
    }

    // Create admin user - let mongoose schema handle the password hashing
    const admin = new User({
      name: "Admin",
      email: "admin@gmail.com",
      password: "@#Ramram123",
      role: "admin",
      position: "Administrator",
      phone: "1234567890",
      department: "Management",
    });

    // Save the user which will trigger the pre-save hook for password hashing
    await admin.save();

    console.log("Admin user created successfully:", admin.email);
    return { success: true, message: "Admin created", user: admin };
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error; // Re-throw to allow proper error handling
  }
};

// Run seeder directly if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB and seed admin
  const mongoURI =
    process.env.MONGO_URI || "mongodb://localhost:27017/dineshcrm";
  console.log("Connecting to MongoDB for direct seeding:", mongoURI);

  mongoose
    .connect(mongoURI)
    .then(() => {
      console.log("Connected to MongoDB for seeding");
      return seedAdmin();
    })
    .then((result) => {
      console.log("Seeding completed:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error during seeding:", err);
      process.exit(1);
    });
}

module.exports = {
  seedAdmin,
};
