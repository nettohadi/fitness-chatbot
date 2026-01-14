#!/usr/bin/env tsx

/**
 * Create Admin User Script
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <password> <fullName>
 *
 * Example:
 *   npx tsx scripts/create-admin.ts admin@example.com SecurePass123 "Admin Name"
 */

import "dotenv/config"
import bcrypt from "bcryptjs"
import { prisma } from "../src/lib/prisma"

async function createAdmin() {
  // Parse command line arguments
  const [email, password, fullName] = process.argv.slice(2)

  // Validate arguments
  if (!email || !password || !fullName) {
    console.error("❌ Error: Missing required arguments\n")
    console.log("Usage:")
    console.log('  npx tsx scripts/create-admin.ts <email> <password> <fullName>\n')
    console.log("Example:")
    console.log('  npx tsx scripts/create-admin.ts admin@example.com SecurePass123 "Admin Name"\n')
    process.exit(1)
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    console.error("❌ Error: Invalid email format")
    process.exit(1)
  }

  // Validate password strength
  if (password.length < 8) {
    console.error("❌ Error: Password must be at least 8 characters long")
    process.exit(1)
  }

  console.log("🔐 Creating admin user...")
  console.log(`📧 Email: ${email}`)
  console.log(`👤 Name: ${fullName}`)

  try {
    // Check if admin already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (existingAdmin) {
      console.error(`\n❌ Error: Admin user with email "${email}" already exists`)
      console.log("\nIf you want to update the password, please delete the existing admin first:")
      console.log(`  npx tsx scripts/delete-admin.ts ${email}\n`)
      process.exit(1)
    }

    // Hash password with bcrypt
    console.log("\n🔒 Hashing password...")
    const passwordHash = await bcrypt.hash(password, 10)

    // Create admin user
    console.log("💾 Saving to database...")
    const admin = await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: "admin",
      },
    })

    console.log("\n✅ Admin user created successfully!\n")
    console.log("📋 Details:")
    console.log(`   ID: ${admin.id}`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Name: ${admin.fullName}`)
    console.log(`   Role: ${admin.role}`)
    console.log(`   Created: ${admin.createdAt.toISOString()}`)
    console.log("\n🚀 You can now login at: http://localhost:3000/admin/login\n")
  } catch (error) {
    console.error("\n❌ Error creating admin user:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
