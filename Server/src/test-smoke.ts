import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000/api/v1';

const runTests = async () => {
  console.log('🧪 Starting RoadSense Phase 1, 2 & 3 Complete API Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: any) => {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (detail) console.error('   Details:', detail);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------------------
    // 1. Health check
    // -------------------------------------------------------------------------
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = (await healthRes.json()) as any;
    assert(healthRes.status === 200 && healthData.status === 'healthy', 'GET /health returns healthy status', healthData);

    // -------------------------------------------------------------------------
    // 2. Demo logins
    // -------------------------------------------------------------------------
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@roadsense.demo', password: 'WrongPassword123' })
    });
    const badLoginData = (await badLoginRes.json()) as any;
    assert(badLoginRes.status === 401 && badLoginData.success === false, 'POST /auth/login with wrong password returns 401', badLoginData);

    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@roadsense.demo', password: 'RoadSense123!' })
    });
    const adminLoginData = (await adminLoginRes.json()) as any;
    const adminToken = adminLoginData.data?.token;
    assert(adminLoginRes.status === 200 && !!adminToken, 'POST /auth/login as Admin returns token', adminLoginData);

    const volunteerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'volunteer@roadsense.demo', password: 'RoadSense123!' })
    });
    const volunteerLoginData = (await volunteerLoginRes.json()) as any;
    const volunteerToken = volunteerLoginData.data?.token;
    assert(volunteerLoginRes.status === 200 && !!volunteerToken, 'POST /auth/login as Volunteer returns token', volunteerLoginData);

    const officerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'officer@roadsense.demo', password: 'RoadSense123!' })
    });
    const officerLoginData = (await officerLoginRes.json()) as any;
    const officerToken = officerLoginData.data?.token;
    assert(officerLoginRes.status === 200 && !!officerToken, 'POST /auth/login as Officer returns token', officerLoginData);

    // -------------------------------------------------------------------------
    // 3. GET /auth/me
    // -------------------------------------------------------------------------
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const meData = (await meRes.json()) as any;
    assert(meRes.status === 200 && meData.data?.email === 'admin@roadsense.demo', 'GET /auth/me returns current user profile', meData);

    // -------------------------------------------------------------------------
    // 4. PHASE 2: Volunteer Registration & Role Policy
    // -------------------------------------------------------------------------
    const uniqueSuffix = Date.now();
    const newVolunteerEmail = `volunteer_${uniqueSuffix}@roadsense.test`;

    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jane Volunteer',
        email: newVolunteerEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'admin' // Injected role must be ignored
      })
    });
    const registerData = (await registerRes.json()) as any;
    assert(
      registerRes.status === 201 &&
      registerData.data?.role === 'volunteer' &&
      !registerData.data?.passwordHash,
      'POST /auth/register creates active volunteer and ignores injected role',
      registerData
    );

    // -------------------------------------------------------------------------
    // 5. PHASE 2: Officer Application & Admin Approval
    // -------------------------------------------------------------------------
    const newOfficerEmail = `officer_applicant_${uniqueSuffix}@roadsense.test`;

    const officerAppRes = await fetch(`${BASE_URL}/auth/officer-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Officer Priya Sharma',
        email: newOfficerEmail,
        password: 'OfficerSecret123!',
        confirmPassword: 'OfficerSecret123!',
        municipality: 'North City Corporation',
        department: 'Infrastructure Division',
        employeeId: 'EMP-7711'
      })
    });
    const officerAppData = (await officerAppRes.json()) as any;
    const officerRequestId = officerAppData.data?._id;
    assert(
      officerAppRes.status === 202 && officerAppData.data?.status === 'pending',
      'POST /auth/officer-register creates pending application',
      officerAppData
    );

    // Admin approves officer request
    const adminApproveRes = await fetch(`${BASE_URL}/admin/officer-requests/${officerRequestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'approved' })
    });
    const adminApproveData = (await adminApproveRes.json()) as any;
    assert(adminApproveRes.status === 200 && adminApproveData.data?.status === 'approved', 'PATCH /admin/officer-requests/:id approves officer', adminApproveData);

    // -------------------------------------------------------------------------
    // 6. PHASE 3: Browser WebM Video Upload Support
    // -------------------------------------------------------------------------
    const webmFixturePath = path.resolve(process.cwd(), 'browser-record.webm');
    // Valid WebM EBML header
    const webmHeaderBytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81]);
    fs.writeFileSync(webmFixturePath, webmHeaderBytes);

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const webmFormData = new FormData();
    webmFormData.append('video', new Blob([fs.readFileSync(webmFixturePath)], { type: 'video/webm' }), 'patrol-recording.webm');
    webmFormData.append('recordingStartedAt', fiveMinutesAgo.toISOString());
    webmFormData.append('recordingEndedAt', now.toISOString());

    const webmUploadRes = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: webmFormData
    });
    const webmUploadData = (await webmUploadRes.json()) as any;
    const webmUploadId = webmUploadData.data?._id;
    assert(
      webmUploadRes.status === 202 &&
      webmUploadData.data?.mimeType.includes('webm') &&
      !!webmUploadData.data?.recordingStartedAt,
      'POST /uploads accepts browser MediaRecorder WebM upload with recording timeline',
      webmUploadData
    );

    // -------------------------------------------------------------------------
    // 7. PHASE 3: Missing / Disguised File Signature Rejection
    // -------------------------------------------------------------------------
    const fakeVideoPath = path.resolve(process.cwd(), 'fake-video.mp4');
    fs.writeFileSync(fakeVideoPath, Buffer.from('Plain text file masquerading as mp4'));

    const fakeFormData = new FormData();
    fakeFormData.append('video', new Blob([fs.readFileSync(fakeVideoPath)], { type: 'video/mp4' }), 'fake-video.mp4');

    const fakeUploadRes = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: fakeFormData
    });
    const fakeUploadData = (await fakeUploadRes.json()) as any;
    assert(
      fakeUploadRes.status === 400 && fakeUploadData.success === false,
      'POST /uploads rejects disguised file failing signature check with 400 Bad Request',
      fakeUploadData
    );

    // -------------------------------------------------------------------------
    // 8. PHASE 3: Upload with Valid GPS Track (CSV timestamp,lat,lng,accuracy)
    // -------------------------------------------------------------------------
    const gpsFixturePath = path.resolve(process.cwd(), 'track.csv');
    const gpsContent = `timestamp,latitude,longitude,accuracy
0,28.631500,77.216700,4.2
2000,28.631750,77.216950,3.8
4000,28.632000,77.217200,4.0
6000,28.632250,77.217450,4.1`;
    fs.writeFileSync(gpsFixturePath, gpsContent);

    const gpsUploadFormData = new FormData();
    gpsUploadFormData.append('video', new Blob([fs.readFileSync(webmFixturePath)], { type: 'video/webm' }), 'tracked-patrol.webm');
    gpsUploadFormData.append('gpsFile', new Blob([fs.readFileSync(gpsFixturePath)], { type: 'text/csv' }), 'track.csv');

    const gpsUploadRes = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: gpsUploadFormData
    });
    const gpsUploadData = (await gpsUploadRes.json()) as any;
    assert(
      gpsUploadRes.status === 202 && !!gpsUploadData.data?._id,
      'POST /uploads with GPS track file accepted for processing',
      gpsUploadData
    );

    // Poll until background processing completes (mimics frontend polling)
    let pollUploadData: any;
    const pollStart = Date.now();
    while (Date.now() - pollStart < 8000) {
      const pollUploadRes = await fetch(`${BASE_URL}/uploads/${gpsUploadData.data?._id}`, {
        headers: { Authorization: `Bearer ${volunteerToken}` }
      });
      pollUploadData = (await pollUploadRes.json()) as any;
      if (pollUploadData.data?.status === 'completed') {
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    assert(
      pollUploadData?.data?.status === 'completed' &&
      pollUploadData?.data?.gpsStatus === 'available' &&
      pollUploadData?.data?.gpsSampleCount === 4,
      'GET /uploads/:id verifies completed status with GPS metadata (sampleCount: 4, status: available)',
      pollUploadData
    );

    // Upload with gpsSamples JSON array field
    const jsonGpsFormData = new FormData();
    jsonGpsFormData.append('video', new Blob([fs.readFileSync(webmFixturePath)], { type: 'video/webm' }), 'json-gps-patrol.webm');
    jsonGpsFormData.append('gpsSamples', JSON.stringify([
      { timestamp: 0, latitude: 28.6315, longitude: 77.2167, accuracy: 3.5 },
      { timestamp: 2000, latitude: 28.6318, longitude: 77.2170, accuracy: 3.5 }
    ]));

    const jsonGpsUploadRes = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: jsonGpsFormData
    });
    const jsonGpsUploadData = (await jsonGpsUploadRes.json()) as any;
    assert(
      jsonGpsUploadRes.status === 202 && !!jsonGpsUploadData.data?._id,
      'POST /uploads accepts gpsSamples JSON array field and starts processing',
      jsonGpsUploadData
    );

    // -------------------------------------------------------------------------
    // 9. PHASE 3: Upload WITHOUT GPS (Coordinates must NOT be fabricated!)
    // -------------------------------------------------------------------------
    const noGpsFormData = new FormData();
    noGpsFormData.append('video', new Blob([fs.readFileSync(webmFixturePath)], { type: 'video/webm' }), 'no-gps-patrol.webm');

    const noGpsUploadRes = await fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${volunteerToken}` },
      body: noGpsFormData
    });
    const noGpsUploadData = (await noGpsUploadRes.json()) as any;
    const noGpsUploadId = noGpsUploadData.data?._id;

    // Poll until completed
    const noGpsPollStart = Date.now();
    while (Date.now() - noGpsPollStart < 8000) {
      const checkRes = await fetch(`${BASE_URL}/uploads/${noGpsUploadId}`, {
        headers: { Authorization: `Bearer ${volunteerToken}` }
      });
      const checkData = (await checkRes.json()) as any;
      if (checkData.data?.status === 'completed') {
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    // Query issues for this specific upload
    const issuesForNoGpsRes = await fetch(`${BASE_URL}/issues?sourceUploadId=${noGpsUploadId}`);
    const issuesForNoGpsData = (await issuesForNoGpsRes.json()) as any;
    const issuesCreatedWithoutGps = issuesForNoGpsData.data?.issues || [];
    assert(
      issuesCreatedWithoutGps.length > 0 &&
      issuesCreatedWithoutGps.every((i: any) => i.location === null),
      'Issues detected from upload without GPS have location: null (never fabricates coordinates)',
      issuesCreatedWithoutGps
    );

    // -------------------------------------------------------------------------
    // 10. PHASE 3: Status Transition, Role Verification & Audit History
    // -------------------------------------------------------------------------
    const allIssuesRes = await fetch(`${BASE_URL}/issues`);
    const allIssuesData = (await allIssuesRes.json()) as any;
    const targetIssue = allIssuesData.data?.issues?.[0];
    const targetIssueId = targetIssue?._id;

    // Volunteer blocked from status change
    const volunteerStatusChangeRes = await fetch(`${BASE_URL}/issues/${targetIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`
      },
      body: JSON.stringify({ status: 'repair_pending' })
    });
    assert(volunteerStatusChangeRes.status === 403, 'Volunteer cannot modify road issue status (403 Forbidden)');

    // Invalid status string rejected with 400
    const invalidStatusRes = await fetch(`${BASE_URL}/issues/${targetIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({ status: 'non_existent_status' })
    });
    assert(invalidStatusRes.status === 400, 'Invalid status string rejected with 400 Validation Error');

    // Officer updates status to repair_pending with reason
    const officerStatusRes = await fetch(`${BASE_URL}/issues/${targetIssueId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`
      },
      body: JSON.stringify({
        status: 'repair_pending',
        reason: 'Assigned to Ward 4 maintenance contractor'
      })
    });
    const officerStatusData = (await officerStatusRes.json()) as any;
    const updatedHistory = officerStatusData.data?.statusHistory || [];
    const latestAudit = updatedHistory[updatedHistory.length - 1];
    assert(
      officerStatusRes.status === 200 &&
      officerStatusData.data?.status === 'repair_pending' &&
      latestAudit?.newStatus === 'repair_pending' &&
      latestAudit?.reason === 'Assigned to Ward 4 maintenance contractor',
      'Officer updates status and appends tamper-proof audit history entry',
      latestAudit
    );

    // -------------------------------------------------------------------------
    // 11. PHASE 3: Dashboard Statistics Breakdowns
    // -------------------------------------------------------------------------
    const statsRes = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = (await statsRes.json()) as any;
    assert(
      statsRes.status === 200 &&
      typeof statsData.data?.totalIssues === 'number' &&
      typeof statsData.data?.byStatus === 'object' &&
      typeof statsData.data?.bySeverity === 'object' &&
      typeof statsData.data?.totalUploads === 'number' &&
      typeof statsData.data?.uploadsByStatus === 'object',
      'GET /dashboard/stats returns real breakdown metrics (byStatus, bySeverity, uploadsByStatus)',
      statsData.data
    );

    // -------------------------------------------------------------------------
    // Cleanup temporary test fixture files
    // -------------------------------------------------------------------------
    if (fs.existsSync(webmFixturePath)) fs.unlinkSync(webmFixturePath);
    if (fs.existsSync(fakeVideoPath)) fs.unlinkSync(fakeVideoPath);
    if (fs.existsSync(gpsFixturePath)) fs.unlinkSync(gpsFixturePath);

    console.log(`\n🎉 Test Suite Completed: ${passed} Passed, ${failed} Failed`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Smoke tests failed with exception:', error);
    process.exit(1);
  }
};

runTests();
