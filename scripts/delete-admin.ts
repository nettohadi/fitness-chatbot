#!/usr/bin/env tsx

/**
 * Delete Admin User Script
 *
 * Usage:
 *   npx tsx scripts/delete-admin.ts <email>
 *
 * Example:
 *   npx tsx scripts/delete-admin.ts admin@example.com
 */

import "dotenv/config"
import { prisma } from "../src/lib/prisma"

async function deleteAdmin() {
  // Parse command line arguments
  const [email] = process.argv.slice(2)

  // Validate arguments
  if (!email) {
    console.error("❌ Error: Missing email argument\n")
    console.log("Usage:")
    console.log('  npx tsx scripts/delete-admin.ts <email>\n')
    console.log("Example:")
    console.log('  npx tsx scripts/delete-admin.ts admin@example.com\n')
    process.exit(1)
  }

  console.log("🔍 Looking for admin user...")
  console.log(`📧 Email: ${email}`)

  try {
    // Find admin user
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    })

    if (!admin) {
      console.error(`\n❌ Error: Admin user with email "${email}" not found\n`)
      process.exit(1)
    }

    console.log("\n📋 Admin found:")
    console.log(`   ID: ${admin.id}`)
    console.log(`   Name: ${admin.fullName}`)
    console.log(`   Role: ${admin.role}`)
    console.log(`   Created: ${admin.createdAt.toISOString()}`)

    // Delete admin user
    console.log("\n🗑️  Deleting admin user...")
    await prisma.adminUser.delete({
      where: { id: admin.id },
    })

    console.log("\n✅ Admin user deleted successfully!\n")
  } catch (error) {
    console.error("\n❌ Error deleting admin user:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

deleteAdmin()
