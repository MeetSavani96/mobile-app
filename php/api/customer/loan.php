<?php
/**
 * Loan API: Get loan banks list and submit loan enquiry
 */
require_once __DIR__ . '/../_cors.php';
require_once __DIR__ . '/../_db.php';
require_once __DIR__ . '/../_auth.php';

$action = $_GET['action'] ?? '';

if ($action === 'get_loan_banks') {
    $stmt = $pdo->query('SELECT * FROM loan_banks WHERE is_active = 1 ORDER BY interest_rate ASC');
    $banks = $stmt->fetchAll();
    echo json_encode(['success' => true, 'banks' => $banks]);
    exit;
}

if ($action === 'submit_loan_enquiry') {
    $user = requireAuth();
    $body = json_decode(file_get_contents('php://input'), true);
    
    $amount     = (float)($body['loan_amount'] ?? 0);
    $tenure     = (int)($body['tenure_years'] ?? 3);
    $rate       = (float)($body['interest_rate'] ?? 9.0);
    $bankId     = isset($body['bank_id']) ? (int)$body['bank_id'] : null;

    if ($amount <= 0) {
        http_response_code(422);
        echo json_encode(['success' => false, 'message' => 'Invalid loan amount.']);
        exit;
    }

    // Monthly EMI calculation
    $monthlyRate = $rate / 12 / 100;
    $months = $tenure * 12;
    $emi = $monthlyRate > 0 
        ? Math.round($amount * $monthlyRate * pow(1 + $monthlyRate, $months) / (pow(1 + $monthlyRate, $months) - 1))
        : Math.round($amount / $months);

    $stmt = $pdo->prepare('
        INSERT INTO loan_enquiries (user_id, loan_amount, tenure_years, interest_rate, estimated_emi, bank_id, status)
        VALUES (:uid, :amt, :tenure, :rate, :emi, :bid, "pending")
    ');
    $stmt->execute([
        ':uid'    => $user['id'],
        ':amt'    => $amount,
        ':tenure' => $tenure,
        ':rate'   => $rate,
        ':emi'    => $emi,
        ':bid'    => $bankId,
    ]);
    $loanId = $pdo->lastInsertId();

    logActivity($user['id'], 'loan_enquiry_submitted', 'loan_enquiries', (int)$loanId, [
        'amount' => $amount,
        'tenure' => $tenure
    ]);

    echo json_encode(['success' => true, 'message' => 'Loan enquiry submitted successfully.']);
    exit;
}
