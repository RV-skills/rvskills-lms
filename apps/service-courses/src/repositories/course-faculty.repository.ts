import { prisma } from "../db/prisma";
import { FacultyRole } from "../generated/prisma/enums";

export const courseFacultyRepository = {
    async findByCourse(course_id: string) {
        return prisma.courseFaculty.findMany({
            where: { course_id },
        });
    },

    async findByFaculty(faculty_id: string, tenant_id: string) {
        return prisma.courseFaculty.findMany({
            where: { faculty_id, tenant_id },
        });
    },

    async assign(course_id: string, faculty_id: string, tenant_id: string, role: FacultyRole = FacultyRole.primary) {
        return prisma.courseFaculty.create({
            data: { course_id, faculty_id, tenant_id, role },
        });
    },

    async updateRole(course_id: string, faculty_id: string, role: FacultyRole) {
        return prisma.courseFaculty.update({
            where: {
                course_id_faculty_id: { course_id, faculty_id },
            },
            data: { role },
        });
    },

    async remove(course_id: string, faculty_id: string) {
        return prisma.courseFaculty.delete({
            where: {
                course_id_faculty_id: { course_id, faculty_id },
            },
        });
    },

    async isFaculty(course_id: string, faculty_id: string) {
        const record = await prisma.courseFaculty.findUnique({
            where: {
                course_id_faculty_id: { course_id, faculty_id },
            },
        });
        return !!record;
    },

    async hasRole(course_id: string, faculty_id: string, role: FacultyRole) {
        const record = await prisma.courseFaculty.findUnique({
            where: {
                course_id_faculty_id: { course_id, faculty_id },
            },
        });
        return record?.role === role;
    },
};