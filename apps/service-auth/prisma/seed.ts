import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
})
const prisma =  new PrismaClient({ adapter });

async function main() {
    const tenant = await prisma.tenant.upsert({ 
        where: { tenant_id: "rv-skills-tenant" },
        update: {},
        create: {
            tenant_id: "rv-skills-tenant",
            tenant_name: "RV-Skills",
            status: "active"
        },
    });


    const adminRole = await prisma.role.upsert({
        where: { role_id: "role-admin" },
        update: {},
        create: {
            role_id: "role-admin",
            tenant_id: tenant.tenant_id,
            role_name: "Admin",
            role_description: "Full access to all system features",
            is_system_role: true,
        },
    });

    const facultyRole = await prisma.role.upsert({
        where: { role_id: "role-faculty" },
        update: {},
        create: {
            role_id: "role-faculty",
            tenant_id: tenant.tenant_id,
            role_name: "Faculty",
            role_description: "Can create and manage courses, assignments and exams",
            is_system_role: true,
        },
    });

    const studentRole = await prisma.role.upsert({
        where: { role_id: "role-student" },
        update: {},
        create: {
            role_id: "role_student",
            tenant_id: tenant.tenant_id,
            role_name: "Student",
            role_description: "Can enroll in courses and submit assignments",
            is_system_role: true
        },
    });

    const permissions = [
        { permission_id: "perm-user-read", resource: "user", action: "read" },
        { permission_id: "perm-user-write", resource: "user", action: "write" },
        { permission_id: "perm-user-delete", resource: "user", action: "delete" },
        { permission_id: "perm-role-read", resource: "role", action: "read" },
        { permission_id: "perm-role-write", resource: "role", action: "write" },
        { permission_id: "perm-course-read", resource: "course", action: "read" },
        { permission_id: "perm-course-write", resource: "course", action: "write" },
        { permission_id: "perm-course-delete", resource: "course", action: "delete" },
        { permission_id: "perm-exam-read", resource: "exam", action: "read" },
        { permission_id: "perm-exam-write", resource: "exam", action: "write" },
        { permission_id: "perm-assignment-read", resource: "assignment", action: "read" },
        { permission_id: "perm-assignment-write", resource: "assignment", action: "write" },
        { permission_id: "perm-enrollment-read",  resource: "enrollment", action: "read"   },
        { permission_id: "perm-enrollment-write", resource: "enrollment", action: "write"  },
    ]

    for( const perm of permissions ){
        await prisma.permission.upsert({
            where: { permission_id: perm.permission_id},
            update: {},
            create: perm,
        });
    }

    const adminPermissions = permissions.map( p => p.permission_id );

    const facultyPermissions = [
        "perm-course-read",
        "perm-course-write",
        "perm-exam-read",
        "perm-exam-write",
        "perm-assignment-read",
        "perm-assignment-write"
    ]

    const studentPermissions = [
        "perm-course-read",
        "perm-exam-read",
        "perm-assignment-read",
        "perm-assignment-write",
        "perm-enrollment-read",
        "perm-enrollment-write"
    ]

    const rolePermissionMap = [
        { role_id: adminRole.role_id, permissions: adminPermissions },
        { role_id: facultyRole.role_id, permissions: facultyPermissions },
        { role_id: studentRole.role_id, permissions: studentPermissions }
    ]

    for( const { role_id, permissions: perms } of rolePermissionMap ){
        for( const permission_id of perms ){
            await prisma.rolePermission.upsert({
                where:{
                    role_id_permission_id: { role_id, permission_id },
                },
                update: {},
                create: { role_id, permission_id },
            });
        }
    }
}


main()
.catch((e) => {
    console.error('seed failed', e);
    process.exit(1);
})
.finally(async () => {
    await prisma.$disconnect();
})