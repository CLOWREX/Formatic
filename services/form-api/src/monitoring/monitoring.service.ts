import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { KnexService } from 'src/database/knex.service';
import { ValidateIsCreator } from 'src/Pipe/validate.is.creator';
import { FormEventsGateway } from 'src/form/form-events.gateway';

@Injectable()
export class MonitoringService {
    constructor(
        private knexService: KnexService,
        private isCreator: ValidateIsCreator,
        private formEventsGateway: FormEventsGateway,
    ) {}

    // Get All Monitor — include current_page, current_soal
    async monitoringSubmit(req: { id: number }, form: any) {
        const checkRole = await this.isCreator.isCreator(req.id, form.id)
        if (checkRole === false) throw new ForbiddenException("Anda Tidak Berhak")

        const getAllStatusSubmit = await this.knexService.connection("form_submit")
            .select(
                "user_id",
                "user_username",
                "start_at",
                "submitted_at",
                "status",
                "attemps",
                "current_page",
                "current_soal",
            )
            .where({ form_id: form.id })
            .orderBy("start_at", "desc")

        return {
            message: "Berhasil mendapatkan status submit",
            status: getAllStatusSubmit
        }
    }

    // Update progress responden (current_page + current_soal) via PATCH
    // Lalu broadcast ke room monitoring creator via WebSocket
    async updateProgress(
        req: { id: number; username: string },
        form: any,
        current_page: number,
        current_soal: number,
        total_pages: number,
        total_soal: number,
    ) {
        // Pastikan user bukan creator (hanya responden yang bisa update progress)
        const checkRole = await this.isCreator.isCreator(req.id, form.id)
        if (checkRole !== false) throw new ForbiddenException("Creator tidak bisa update progress responden")

        // Cek record form_submit ada
        const existing = await this.knexService.connection("form_submit")
            .select("status", "start_at")
            .where({ user_id: req.id, form_id: form.id })
            .first()

        if (!existing) throw new NotFoundException("Data pengerjaan tidak ditemukan")
        if (existing.status === "completed") {
            // Sudah selesai, tidak perlu update
            return { message: "Sudah selesai" }
        }

        // Update current_page & current_soal
        await this.knexService.connection("form_submit")
            .update({ current_page, current_soal })
            .where({ user_id: req.id, form_id: form.id })

        // Broadcast real-time ke creator via WebSocket
        this.formEventsGateway.notifyProgressUpdated(form.slug, {
            user_id: req.id,
            user_username: req.username,
            current_page,
            current_soal,
            total_pages,
            total_soal,
            status: existing.status,
            start_at: existing.start_at,
        })

        return { message: "Progress diperbarui" }
    }

    // Reset user
    async resetUser(req: { id: number }, form: any, user_id: number) {
        const checkRole = await this.isCreator.isCreator(req.id, form.id)
        if (checkRole === false) throw new ForbiddenException("Anda Tidak Berhak")

        const getStatus = await this.knexService.connection("form_submit")
            .select("status")
            .where({ user_id: user_id, form_id: form.id })
            .first()

        if (!getStatus) throw new NotFoundException("Tidak Ada User Tersebut")
        if (getStatus.status != "progress") throw new BadRequestException("Reset hanya untuk progress")

        await this.knexService.connection("form_submit")
            .update({ status: "reset", current_page: 1, current_soal: 0 })
            .where({ user_id: user_id, form_id: form.id })

        return { message: "Berhasil Reset" }
    }
}
