import { prisma } from "../db/prisma";
import { ProcessingStatus } from "../generated/prisma/enums";

export interface CreateContentMetadataInput {
    lesson_id: string;
    s3_key: string;
    mime_type: string;
    file_size: number;
    duration_secs?: number;
    original_filename?: string;
}

export const contentMetadataRepository = {
    
    async findByLesson(lesson_id: string) {
        return prisma.contentMetadata.findUnique({
            where: { lesson_id },
        });
    },

    async create(data: CreateContentMetadataInput) {
        return prisma.contentMetadata.create({ data });
    },

    async update(content_id: string, data: Partial<CreateContentMetadataInput>) {
        return prisma.contentMetadata.update({
            where: { content_id },
            data,
        });
    },

    async updateProcessingStatus(content_id: string, status: ProcessingStatus) {
        return prisma.contentMetadata.update({
            where: { content_id },
            data: { processing_status: status },
        });
    },

    async incrementDownloadCount(content_id: string) {
        return prisma.contentMetadata.update({
            where: { content_id },
            data: { download_count: { increment: 1 } },
        });
    },

    async deleteLesson(lesson_id: string){
        return prisma.contentMetadata.delete({
            where: { lesson_id },
        });
    },

    async upsertVideoUrl(lesson_id: string, video_url: string) {
        return prisma.contentMetadata.upsert({
            where: { lesson_id },
            update: { video_url, processing_status: "READY" },
            create: {
                lesson_id,
                video_url,
                s3_key: "external-url",
                mime_type: "video/mp4",
                file_size: 0,
                processing_status: "READY",
            },
        });
    },

    async remove(lesson_id: string) {
        return prisma.contentMetadata.deleteMany({ where: { lesson_id } });
    },
};