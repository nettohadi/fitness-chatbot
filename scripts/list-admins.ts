#!/usr/bin/env tsx

/**
 * List All Admin Users Script
 *
 * Usage:
 *   npx tsx scripts/list-admins.ts
 */

import "dotenv/config"
import { prisma } from "../src/lib/prisma"

async function listAdmins() {
  console.log("🔍 Fetching all admin users...\n")

  try {
    const admins = await prisma.adminUser.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    if (admins.length === 0) {
      console.log("📭 No admin users found\n")
      console.log("Create your first admin with:")
      console.log('  npx tsx scripts/create-admin.ts admin@example.com password123 "Admin Name"\n')
      process.exit(0)
    }

    console.log(`✅ Found ${admins.length} admin user(s):\n`)

    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.fullName}`)
      console.log(`   📧 Email: ${admin.email}`)
      console.log(`   🆔 ID: ${admin.id}`)
      console.log(`   👔 Role: ${admin.role}`)
      console.log(`   📅 Created: ${admin.createdAt.toISOString()}`)
      console.log(`   🔐 Last Login: ${admin.lastLoginAt?.toISOString() || "Never"}`)
      console.log()
    })
  } catch (error) {
    console.error("❌ Error fetching admin users:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

listAdmins()
