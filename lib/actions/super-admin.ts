'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createSchool(data: {
  name: string
  slug: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  country: string
  postalCode: string
  subscriptionPlan: string
  logoUrl?: string
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPhone: string
  adminPassword: string
}) {
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const { data: school, error } = await supabase
    .from('schools')
    .insert({
      name: data.name,
      slug: data.slug,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country,
      subscription_plan: data.subscriptionPlan as any,
      logo_url: data.logoUrl || null,
      is_active: true,
      settings: {
        timezone: 'UTC',
        currency: 'USD',
        max_students: 500,
        max_teachers: 50,
      },
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  let authUserId: string | null = null

  // Try admin.createUser to create the auth user
  const { data: authData, error: adminError } = await serviceClient.auth.admin.createUser({
    email: data.adminEmail,
    password: data.adminPassword,
    email_confirm: true,
    user_metadata: {
      first_name: data.adminFirstName,
      last_name: data.adminLastName,
      role: 'school_admin',
    },
  })

  if (adminError) {
    // If user already exists (most common cause), try to find them via listUsers
    const { data: users } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 10000 })
    const existing = users?.users.find(u => u.email === data.adminEmail)

    if (existing) {
      authUserId = existing.id
      // Update metadata for existing user
      await serviceClient.auth.admin.updateUserById(existing.id, {
        user_metadata: {
          first_name: data.adminFirstName,
          last_name: data.adminLastName,
          role: 'school_admin',
        },
      })
    } else {
      await supabase.from('schools').delete().eq('id', school.id)
      throw new Error(
        `Failed to create admin user. ${adminError.message}. ` +
        `Ensure the email "${data.adminEmail}" is not already registered and ` +
        `the password meets the minimum requirements.`
      )
    }
  } else if (authData?.user) {
    authUserId = authData.user.id
  }

  if (!authUserId) {
    await supabase.from('schools').delete().eq('id', school.id)
    throw new Error('Failed to create admin user')
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: authUserId,
      email: data.adminEmail,
      first_name: data.adminFirstName,
      last_name: data.adminLastName,
      phone: data.adminPhone,
      role: 'school_admin',
      school_id: school.id,
      is_active: true,
    }, { onConflict: 'id' })

  if (profileError) {
    await supabase.from('schools').delete().eq('id', school.id)
    throw new Error(`Failed to create profile: ${profileError.message}`)
  }

  revalidatePath('/super-admin/schools')
  return school
}

export async function updateSchool(
  id: string,
  data: Partial<{
    name: string
    email: string
    phone: string
    address: string
    city: string
    country: string
    is_active: boolean
    subscription_plan: string
  }>
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('schools')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/schools')
}

export async function toggleSchoolStatus(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('schools')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/schools')
}

export async function deleteSchool(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/schools')
}

export async function updateSchoolSubscription(
  schoolId: string,
  plan: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('schools')
    .update({ subscription_plan: plan as any })
    .eq('id', schoolId)

  if (error) throw new Error(error.message)
  revalidatePath('/super-admin/subscriptions')
  revalidatePath('/super-admin/schools')
}
