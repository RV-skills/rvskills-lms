import { prisma } from "../db/prisma";

export const courseFacultyRepository = {

    async findByCourse(course_id: string){
        return prisma.courseFaculty.findMany({
            where: { course_id },
        });
    },

    async findByFaculty(faculty_id: string){
        return prisma.courseFaculty.findMany({
            where: { faculty_id },
        });
    },

    async assign(course_id: string, faculty_id: string, role: string = "primary") {
        return prisma.courseFaculty.create({
            data: { course_id, faculty_id, role },
        });
    },

    async updateRole(course_id: string, faculty_id: string, role: string) {
        return prisma.courseFaculty.update({
            where: {
                course_id_faculty_id: { course_id, faculty_id},
            },
            data: { role },
        });
    },

    async remove(course_id: string, faculty_id: string){
        return prisma.courseFaculty.delete({
            where: {
                course_id_faculty_id: { course_id, faculty_id },
            },
        });
    },

    async isFaculty(course_id: string, faculty_id: string){
        const record = await prisma.courseFaculty.findUnique({
            where: {
                course_id_faculty_id: { course_id, faculty_id },
            },
        });
        return !!record;
    }

}