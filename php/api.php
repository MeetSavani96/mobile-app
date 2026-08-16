<?php
/**
 * AKV Energy — Central API Router.
 * Maps incoming '?action=...' queries to the respective handler files.
 */
require_once __DIR__ . '/api/_cors.php';
require_once __DIR__ . '/api/security.php';
require_once __DIR__ . '/api/_db.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        require_once __DIR__ . '/api/auth/login.php';
        break;
    case 'register':
        require_once __DIR__ . '/api/auth/register.php';
        break;
    case 'forgot_password':
        require_once __DIR__ . '/api/auth/forgot-password.php';
        break;
    case 'health':
        require_once __DIR__ . '/api/health.php';
        break;
    case 'logout':
        require_once __DIR__ . '/api/auth/logout.php';
        break;
    case 'session':
        require_once __DIR__ . '/api/auth/me.php';
        break;
    case 'admin_dashboard':
        require_once __DIR__ . '/api/admin/dashboard.php';
        break;

    // Customer Workflows
    case 'customer_bookings':
        require_once __DIR__ . '/api/customer/bookings.php';
        break;
    case 'customer_inverter':
        require_once __DIR__ . '/api/customer/inverter.php';
        break;
    case 'submit_maintenance':
    case 'get_customer_maintenance':
        require_once __DIR__ . '/api/customer/maintenance.php';
        break;
    case 'submit_solar_enquiry':
        require_once __DIR__ . '/api/customer/solar-enquiry.php';
        break;
    case 'submit_cleaning':
        require_once __DIR__ . '/api/customer/cleaning.php';
        break;
    case 'get_loan_banks':
    case 'submit_loan_enquiry':
        require_once __DIR__ . '/api/customer/loan.php';
        break;
    case 'customer_documents':
    case 'customer_transactions':
    case 'customer_queries':
    case 'submit_query':
    case 'get_notifications':
    case 'mark_notification_read':
    case 'customer_profile_stats':
        require_once __DIR__ . '/api/customer/customer-extra.php';
        break;

    // Admin Actions
    case 'link_customer':
    case 'unlink_customer':
        require_once __DIR__ . '/api/admin/customer-link.php';
        break;
    case 'add_inverter':
    case 'list_inverters':
        require_once __DIR__ . '/api/admin/inverters.php';
        break;

    case 'get_profile':
    case 'save_profile':
    case 'change_password':
        require_once __DIR__ . '/api/auth/profile.php';
        break;
    case 'get_quotations':
    case 'create_quotation':
    case 'update_quotation':
    case 'delete_quotation':
    case 'accept_quotation':
    case 'reject_quotation':
        require_once __DIR__ . '/api/admin/quotations.php';
        break;
    case 'get_installations':
    case 'create_installation':
    case 'update_installation':
    case 'delete_installation':
    case 'assign_engineer':
        require_once __DIR__ . '/api/admin/installations.php';
        break;
    case 'get_engineers':
    case 'create_engineer':
    case 'update_engineer':
    case 'delete_engineer':
        require_once __DIR__ . '/api/admin/engineers.php';
        break;
    case 'get_invoices':
    case 'create_invoice':
    case 'update_invoice':
    case 'delete_invoice':
        require_once __DIR__ . '/api/admin/invoices.php';
        break;
    case 'get_payments':
    case 'create_payment':
        require_once __DIR__ . '/api/admin/payments.php';
        break;
    case 'get_documents':
    case 'upload_document':
    case 'delete_document':
    case 'verify_document':
    case 'reject_document':
        require_once __DIR__ . '/api/admin/documents.php';
        break;
    case 'dashboard_statistics':
    case 'revenue_report':
    case 'sales_report':
    case 'customer_report':
    case 'installation_report':
    case 'payment_report':
    case 'engineer_report':
    case 'quotation_report':
    case 'document_report':
        require_once __DIR__ . '/api/admin/reports.php';
        break;
    case 'admin_list_products':
    case 'admin_create_product':
    case 'admin_update_product':
    case 'admin_delete_product':
        require_once __DIR__ . '/api/admin/products.php';
        break;
    case 'submit_lead':
    case 'get_my_enquiries':
    case 'submit_contact':
        require_once __DIR__ . '/api/leads/enquiries.php';
        break;
    case 'submit_complaint':
    case 'get_complaints':
    case 'update_complaint':
        require_once __DIR__ . '/api/support/tickets.php';
        break;
    case 'get_maintenance':
    case 'schedule_maintenance':
    case 'update_maintenance':
        require_once __DIR__ . '/api/support/maintenance.php';
        break;
    case 'admin_maintenance':
    case 'admin_update_maintenance':
        require_once __DIR__ . '/api/admin/maintenance.php';
        break;
    case 'get_enquiries':
    case 'update_enquiry':
        require_once __DIR__ . '/api/admin/enquiries.php';
        break;
    case 'list_admins':
        require_once __DIR__ . '/api/admin/users.php';
        break;
    case 'get_customers':
        require_once __DIR__ . '/api/customers/list.php';
        break;
    case 'create_customer':
        require_once __DIR__ . '/api/customers/create.php';
        break;
    case 'update_customer':
        require_once __DIR__ . '/api/customers/update.php';
        break;
    case 'delete_customer':
        require_once __DIR__ . '/api/customers/delete.php';
        break;
    case 'get_settings':
    case 'save_settings':
        require_once __DIR__ . '/api/admin/settings.php';
        break;
    case 'backup_database':
    case 'restore_database':
        require_once __DIR__ . '/api/admin/backup.php';
        break;
    case 'download_pdf':
        require_once __DIR__ . '/api/admin/download_pdf.php';
        break;
    default:
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "Action '$action' not resolved by router."]);
        break;
}
