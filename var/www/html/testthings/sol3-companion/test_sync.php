<?php
// Comprehensive unit test for sync.php logic
$sessionsDir = __DIR__ . '/sessions';
if (!is_dir($sessionsDir)) mkdir($sessionsDir, 0777, true);

$sessionId = 'R45-UNITTEST';
$filePath = $sessionsDir . '/session_' . md5($sessionId) . '.json';
if (file_exists($filePath)) unlink($filePath);

function runAction($action, $session, $extra = []) {
    $script = __DIR__ . '/sync.php';
    $params = array_merge(['action' => $action, 'session' => $session], $extra);
    $encodedParams = var_export($params, true);
    
    $runnerCode = "<?php\n" .
        "\$_SERVER['REQUEST_METHOD'] = 'GET';\n" .
        "\$_GET = $encodedParams;\n" .
        "include " . var_export($script, true) . ";\n";
        
    $tmpFile = __DIR__ . '/sessions/tmp_runner_' . uniqid() . '.php';
    file_put_contents($tmpFile, $runnerCode);
    
    $output = shell_exec('php ' . escapeshellarg($tmpFile));
    @unlink($tmpFile);
    
    $json = json_decode($output, true);
    if (!$json) {
        echo "FAIL [RAW OUTPUT]: $output\n";
    }
    return $json;
}

echo "1. Testing 'create' action...\n";
$res1 = runAction('create', $sessionId);
assert($res1['status'] === 'success', "create status must be success");
assert($res1['session']['id'] === $sessionId, "session ID match");
assert($res1['session']['state'] === 'standby', "initial state standby");
echo "OK: Session created, state=standby, version={$res1['session']['version']}\n";

echo "2. Testing 'poll' without change...\n";
$res2 = runAction('poll', $sessionId, ['v' => $res1['session']['version']]);
assert($res2['status'] === 'success');
assert($res2['changed'] === false, "changed should be false");
echo "OK: Poll returns changed=false\n";

echo "3. Testing 'join' action from mobile...\n";
$res3 = runAction('join', $sessionId);
assert($res3['status'] === 'success');
assert($res3['session']['mobile_connected'] === true);
assert($res3['session']['state'] === 'connected');
echo "OK: Mobile joined, state=connected\n";

echo "4. Testing 'scan_start' action...\n";
$res4 = runAction('scan_start', $sessionId);
assert($res4['status'] === 'success');
assert($res4['session']['state'] === 'scanning');
echo "OK: Scan started, state=scanning\n";

echo "5. Testing 'reveal' action...\n";
$res5 = runAction('reveal', $sessionId);
assert($res5['status'] === 'success');
assert($res5['session']['state'] === 'revealed');
assert($res5['session']['secret'] === 'SUFFOCATION');
echo "OK: Revealed secret, state=revealed\n";

echo "6. Testing 'poll' detecting reveal...\n";
$res6 = runAction('poll', $sessionId, ['v' => 1]);
assert($res6['changed'] === true);
assert($res6['session']['state'] === 'revealed');
echo "OK: PC poll detected reveal!\n";

echo "7. Testing 'rescan' action...\n";
$res7 = runAction('rescan', $sessionId);
assert($res7['status'] === 'success');
assert($res7['session']['state'] === 'connected');
assert($res7['session']['mobile_connected'] === true);
echo "OK: Session ready for rescan, state=connected, mobile_connected=true\n";

echo "8. Testing 'reset' action...\n";
$res8 = runAction('reset', $sessionId);
assert($res8['status'] === 'success');
assert($res8['session']['state'] === 'standby');
assert($res8['session']['mobile_connected'] === false);
echo "OK: Session reset successfully!\n";

// Cleanup unit test file
if (file_exists($filePath)) unlink($filePath);

echo "\n>>> ALL SYNC API UNIT TESTS PASSED PERFECTLY! <<<\n";
