const BASE_URL = 'http://localhost:5000/api/v1';

async function runE2EIntegrationAudit() {
  console.log('🚀 Running Full-Stack E2E Integration Audit between Client & Server...\n');
  let passed = 0;
  let total = 0;

  function test(name: string, ok: boolean, details?: string) {
    total++;
    if (ok) {
      passed++;
      console.log(`✅ [${total}] PASS: ${name}`);
    } else {
      console.error(`❌ [${total}] FAIL: ${name} - ${details || ''}`);
    }
  }

  // 1. CORS Preflight & Headers Test
  try {
    const corsRes = await fetch('http://localhost:5000/api/v1/health', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    const allowOrigin = corsRes.headers.get('access-control-allow-origin');
    const allowCreds = corsRes.headers.get('access-control-allow-credentials');
    test(
      'CORS allows Origin http://localhost:5173 with credentials',
      allowOrigin === 'http://localhost:5173' && allowCreds === 'true',
      `origin: ${allowOrigin}, credentials: ${allowCreds}`
    );
  } catch (err: any) {
    test('CORS allows Origin http://localhost:5173', false, err.message);
  }

  // 2. Volunteer Registration
  const testVolEmail = `test.surveyor.${Date.now()}@roadsense.demo`;
  try {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Volunteer Surveyor',
        email: testVolEmail,
        password: 'RoadSense123!',
        confirmPassword: 'RoadSense123!'
      })
    });
    const regData = (await regRes.json()) as any;
    test(
      'Volunteer registration (POST /auth/register) succeeds',
      regRes.status === 201 && regData?.success === true && regData?.data?.role === 'volunteer',
      JSON.stringify(regData)
    );
  } catch (err: any) {
    test('Volunteer registration (POST /auth/register)', false, err.message);
  }

  // 3. Volunteer Login & Bearer Token
  let volToken = '';
  try {
    const volLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testVolEmail,
        password: 'RoadSense123!'
      })
    });
    const loginData = (await volLogin.json()) as any;
    volToken = loginData?.data?.token;
    test(
      'Volunteer login (POST /auth/login) returns valid JWT token',
      volLogin.status === 200 && Boolean(volToken),
      JSON.stringify(loginData)
    );
  } catch (err: any) {
    test('Volunteer login (POST /auth/login)', false, err.message);
  }

  // 4. Municipal Officer Registration
  const testOfficerEmail = `test.officer.${Date.now()}@roadsense.gov`;
  let pendingRequestId = '';
  try {
    const offReg = await fetch(`${BASE_URL}/auth/officer-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Cadet Officer Neha Gupta',
        email: testOfficerEmail,
        password: 'RoadSense123!',
        confirmPassword: 'RoadSense123!',
        municipality: 'Central Metro Municipal Council',
        department: 'Pavement Maintenance Bureau',
        employeeId: 'CMMC-2026-88'
      })
    });
    const offData = (await offReg.json()) as any;
    pendingRequestId = offData?.data?._id;
    test(
      'Officer registration (POST /auth/officer-register) creates pending approval record',
      (offReg.status === 201 || offReg.status === 202) && offData?.success === true && offData?.data?.status === 'pending',
      JSON.stringify(offData)
    );
  } catch (err: any) {
    test('Officer registration (POST /auth/officer-register)', false, err.message);
  }

  // 5. Admin Login
  let adminToken = '';
  try {
    const adminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@roadsense.demo',
        password: 'RoadSense123!'
      })
    });
    const adminData = (await adminLogin.json()) as any;
    adminToken = adminData?.data?.token;
    test(
      'Admin login (POST /auth/login) returns Admin Bearer token',
      adminLogin.status === 200 && adminData?.data?.user?.role === 'admin',
      JSON.stringify(adminData)
    );
  } catch (err: any) {
    test('Admin login (POST /auth/login)', false, err.message);
  }

  // 6. Admin List Officer Requests
  try {
    const listReqs = await fetch(`${BASE_URL}/admin/officer-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listData = (await listReqs.json()) as any;
    const found = listData?.data?.requests?.some((r: any) => r._id === pendingRequestId);
    test(
      'Admin list officer requests (GET /admin/officer-requests) includes pending officer',
      listReqs.status === 200 && found,
      JSON.stringify(listData)
    );
  } catch (err: any) {
    test('Admin list officer requests (GET /admin/officer-requests)', false, err.message);
  }

  // 7. Admin Approve Officer Request
  try {
    const reviewRes = await fetch(`${BASE_URL}/admin/officer-requests/${pendingRequestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'approved' })
    });
    const reviewData = (await reviewRes.json()) as any;
    test(
      'Admin approve officer (PATCH /admin/officer-requests/:id) successfully approves request',
      reviewRes.status === 200 && reviewData?.data?.status === 'approved',
      JSON.stringify(reviewData)
    );
  } catch (err: any) {
    test('Admin approve officer (PATCH /admin/officer-requests/:id)', false, err.message);
  }

  // 8. Approved Officer Login
  let officerToken = '';
  try {
    const officerLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testOfficerEmail,
        password: 'RoadSense123!'
      })
    });
    const offLoginData = (await officerLogin.json()) as any;
    officerToken = offLoginData?.data?.token;
    test(
      'Newly approved Officer login succeeds with role municipal_officer',
      officerLogin.status === 200 && offLoginData?.data?.user?.role === 'municipal_officer',
      JSON.stringify(offLoginData)
    );
  } catch (err: any) {
    test('Newly approved Officer login', false, err.message);
  }

  // 9. Volunteer Dashcam Upload with GPS Track
  let createdUploadId = '';
  try {
    const formData = new FormData();
    const mockWebm = new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00])], { type: 'video/webm' });
    formData.append('video', mockWebm, 'dashcam_survey.webm');

    const gpsCsv = 'timestamp,latitude,longitude,accuracy\n0,28.6139,77.2090,2.5\n2000,28.6145,77.2095,2.1';
    formData.append('gpsFile', new Blob([gpsCsv], { type: 'text/csv' }), 'survey_track.csv');
    formData.append('description', 'Integrated dashcam road scan with GPS telemetry');
    formData.append('recordingStartedAt', '2026-10-17T10:00:00.000Z');
    formData.append('recordingEndedAt', '2026-10-17T10:00:10.000Z');

    const uploadRes = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${volToken}`
      },
      body: formData
    });
    const uploadData = (await uploadRes.json()) as any;
    createdUploadId = uploadData?.data?._id;
    test(
      'Volunteer upload (POST /uploads) accepts video and GPS track, begins processing',
      (uploadRes.status === 201 || uploadRes.status === 202) && Boolean(createdUploadId),
      JSON.stringify(uploadData)
    );
  } catch (err: any) {
    test('Volunteer upload (POST /uploads)', false, err.message);
  }

  // 10. Upload Details Polling (Wait for background pipeline completion)
  try {
    let detailData: any;
    const pollStart = Date.now();
    while (Date.now() - pollStart < 6000) {
      const detailRes = await fetch(`${BASE_URL}/uploads/${createdUploadId}`, {
        headers: { Authorization: `Bearer ${volToken}` }
      });
      detailData = (await detailRes.json()) as any;
      if (detailData?.data?.status === 'completed') {
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    test(
      'Upload polling (GET /uploads/:id) returns progress and GPS metadata',
      detailData?.data?.status === 'completed' && detailData?.data?.gpsStatus === 'available',
      JSON.stringify(detailData)
    );
  } catch (err: any) {
    test('Upload polling (GET /uploads/:id)', false, err.message);
  }

  // 11. Issue Listing & Filters
  let sampleIssueId = '';
  try {
    const issuesRes = await fetch(`${BASE_URL}/issues?limit=10&page=1`, {
      headers: { Authorization: `Bearer ${officerToken}` }
    });
    const issuesData = (await issuesRes.json()) as any;
    const issues = issuesData?.data?.issues || [];
    if (issues.length > 0) sampleIssueId = issues[0]._id;
    test(
      'Issue listing (GET /issues) returns issues with pagination',
      issuesRes.status === 200 && Array.isArray(issues) && issues.length > 0,
      JSON.stringify(issuesData)
    );
  } catch (err: any) {
    test('Issue listing (GET /issues)', false, err.message);
  }

  // 12. Officer Triage Status Update with Audit Reason
  try {
    const statusRes = await fetch(`${BASE_URL}/issues/${sampleIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        status: 'repair_pending',
        reason: 'Inspection scheduled with ward contractor'
      })
    });
    const statusData = (await statusRes.json()) as any;
    test(
      'Officer status update (PATCH /issues/:id/status) updates status & appends audit trail',
      statusRes.status === 200 && statusData?.data?.status === 'repair_pending',
      JSON.stringify(statusData)
    );
  } catch (err: any) {
    test('Officer status update (PATCH /issues/:id/status)', false, err.message);
  }

  // 13. Dashboard Metrics (stats)
  try {
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = (await statsRes.json()) as any;
    const d = statsData?.data;
    test(
      'Dashboard stats (GET /dashboard/stats) returns complete metrics breakdowns',
      statsRes.status === 200 &&
      typeof d?.totalIssues === 'number' &&
      typeof d?.criticalIssues === 'number' &&
      Boolean(d?.bySeverity) &&
      Boolean(d?.byStatus) &&
      Boolean(d?.uploadsByStatus),
      JSON.stringify(statsData)
    );
  } catch (err: any) {
    test('Dashboard stats (GET /dashboard/stats)', false, err.message);
  }

  // 14. Reports Summary (reports)
  try {
    const reportsRes = await fetch(`${BASE_URL}/reports/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const reportsData = (await reportsRes.json()) as any;
    const r = reportsData?.data;
    test(
      'Reports summary (GET /reports/summary) returns aggregated distribution data',
      reportsRes.status === 200 &&
      Boolean(r?.bySeverity) &&
      Boolean(r?.byStatus) &&
      Boolean(r?.byType) &&
      typeof r?.averagePriorityScore === 'number',
      JSON.stringify(reportsData)
    );
  } catch (err: any) {
    test('Reports summary (GET /reports/summary)', false, err.message);
  }

  // 15. Role Guard: Volunteer Cannot Update Issue Status
  try {
    const volUpdateRes = await fetch(`${BASE_URL}/issues/${sampleIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volToken}`
      },
      body: JSON.stringify({ status: 'repaired' })
    });
    test(
      'Volunteer cannot modify issue status (403 Forbidden)',
      volUpdateRes.status === 403,
      `Status code: ${volUpdateRes.status}`
    );
  } catch (err: any) {
    test('Volunteer cannot modify issue status (403 Forbidden)', false, err.message);
  }

  // 16. Missing GPS Coordinates Remain Unmapped
  try {
    const noGpsForm = new FormData();
    const mockWebm = new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00])], { type: 'video/webm' });
    noGpsForm.append('video', mockWebm, 'indoor_test_video.webm');
    noGpsForm.append('description', 'Survey with GPS disabled');

    const noGpsRes = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volToken}` },
      body: noGpsForm
    });
    const noGpsData = (await noGpsRes.json()) as any;
    const noGpsUploadId = noGpsData?.data?._id;

    // Poll until completed
    const pollStart = Date.now();
    while (Date.now() - pollStart < 6000) {
      const pollRes = await fetch(`${BASE_URL}/uploads/${noGpsUploadId}`, {
        headers: { Authorization: `Bearer ${volToken}` }
      });
      const pollData = (await pollRes.json()) as any;
      if (pollData?.data?.status === 'completed') {
        break;
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    const checkIssues = await fetch(`${BASE_URL}/issues?sourceUploadId=${noGpsUploadId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const checkIssuesData = (await checkIssues.json()) as any;
    const issues = checkIssuesData?.data?.issues || [];
    const unmapped = issues.length > 0 && issues.every((i: any) => i.location === null);
    test(
      'Upload without GPS preserves location: null (never invents coordinates)',
      unmapped === true,
      `Issues count: ${issues.length}, Sample location: ${JSON.stringify(issues[0]?.location)}`
    );
  } catch (err: any) {
    test('Upload without GPS preserves location: null', false, err.message);
  }

  console.log(`\n========================================`);
  console.log(`E2E Integration Audit Results: ${passed} / ${total} Passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`========================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2EIntegrationAudit().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
