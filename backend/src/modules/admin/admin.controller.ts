import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ArchiveService } from '../archive/archive.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard, Roles } from './guards/roles.guard';
import {
  AdminLoginDto,
  VerifyTotpDto,
  ReviewTicketDto,
  CreateAdminDto,
  UpdateAdminDto,
  ReviewReportDto,
} from './dto/admin.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly archiveService: ArchiveService,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @Post('auth/verify-totp')
  @HttpCode(HttpStatus.OK)
  async verifyTotp(@Body() dto: VerifyTotpDto) {
    return this.adminService.verifyTotp(dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardKpis();
  }

  @UseGuards(AdminAuthGuard)
  @Get('pairs')
  async getPairs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getPairs(page, limit, status);
  }

  @UseGuards(AdminAuthGuard)
  @Get('tickets')
  async getTickets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getTickets(page, limit, status);
  }

  @UseGuards(AdminAuthGuard)
  @Get('tickets/:id')
  async getTicketDetail(@Param('id') id: string) {
    return this.adminService.getTicketDetail(id);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('tickets/:id/approve')
  async approveTicket(
    @Req() req: any,
    @Param('id') ticketId: string,
    @Body() dto: ReviewTicketDto,
  ) {
    return this.archiveService.approveTicket(
      req.admin.id,
      ticketId,
      dto.note,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @UseGuards(AdminAuthGuard)
  @Patch('tickets/:id/reject')
  async rejectTicket(
    @Req() req: any,
    @Param('id') ticketId: string,
    @Body() dto: ReviewTicketDto,
  ) {
    return this.archiveService.rejectTicket(
      req.admin.id,
      ticketId,
      dto.note,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @UseGuards(AdminAuthGuard)
  @Post('tickets/:id/restore')
  async executeRestoration(@Req() req: any, @Param('id') ticketId: string) {
    return this.archiveService.executeRestoration(
      req.admin.id,
      ticketId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('audit-logs')
  async getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.getAuditLogs(page, limit, adminId, action);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Get('users')
  async listAdmins() {
    return this.adminService.listAdmins();
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('users')
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch('users/:id')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(id, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get('reports')
  async getReports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('status') status?: string,
  ) {
    return this.adminService.getReports(page, limit, status);
  }

  @UseGuards(AdminAuthGuard)
  @Patch('reports/:id')
  async reviewReport(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewReportDto,
  ) {
    return this.adminService.reviewReport(req.admin.id, id, dto);
  }
}
