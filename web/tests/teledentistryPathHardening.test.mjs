import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const dentistPortalSource = fs.readFileSync(
  path.resolve('web/src/pages/dentist-portal/teledentistry/index.jsx'),
  'utf8'
);

const mobileChatHookSource = fs.readFileSync(
  path.resolve('mobile/src/hooks/useChat.js'),
  'utf8'
);

test('dentist ChatInterface start-call action opens the pre-call checklist', () => {
  assert.equal(dentistPortalSource.includes('onStartVideoCall={handleStartVideoCall}'), false);
  assert.match(dentistPortalSource, /onStartVideoCall=\{openPreCallChecklist\}/);
});

test('mobile attachment upload errors are rethrown to the patient screen', () => {
  const uploadFunctionStart = mobileChatHookSource.indexOf('const sendAttachmentMessage');
  assert.notEqual(uploadFunctionStart, -1, 'expected sendAttachmentMessage function');
  const uploadFunctionSource = mobileChatHookSource.slice(uploadFunctionStart, mobileChatHookSource.indexOf('const emitVideoCall', uploadFunctionStart));
  const uploadCatch = uploadFunctionSource.match(/catch \(error\) \{[\s\S]*?upload attachment failed[\s\S]*?\n\s*\}/);
  assert.ok(uploadCatch, 'expected sendAttachmentMessage upload catch block');
  assert.match(uploadCatch[0], /throw error/);
});
