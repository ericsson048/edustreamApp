import type { BuildRoomHtmlOptions } from './types';

export function buildRoomHtml({ wsHost, authToken, sessionId }: BuildRoomHtmlOptions): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
${ROOM_CSS}
</style>
</head>
<body style="display:flex;flex-direction:column;height:100%">
${ROOM_MARKUP}
<script>
${roomScript({ wsHost, authToken, sessionId })}
</script>
</body>
</html>`;
}

const ICON_MIC = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;
const ICON_CAM = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;
const ICON_HAND = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.21 0-4.21-.9-5.66-2.34L3.5 14.8a.5.5 0 0 1 .68-.71L6 16"/></svg>`;
const ICON_SMILE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
const ICON_LEAVE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;

const ROOM_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, system-ui, sans-serif; background: #0b1120; color: #e2e8f0; overflow: hidden; height: 100%; }

#videos { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; flex: 1; min-height: 0; align-content: flex-start; }
.video-wrap { position: relative; flex: 1 1 calc(50% - 8px); min-width: 120px; min-height: 120px; border-radius: 12px; overflow: hidden; background: #1e293b; }
.video-wrap video { width: 100%; height: 100%; object-fit: cover; }
.video-label { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,.6); padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.video-label .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.video-label .dot.on { background: #22c55e; }
.video-label .dot.off { background: #ef4444; }

#status { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; font-size: 12px; }
#status .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
#status .dot.connected { background: #22c55e; }
#status .dot.disconnected { background: #ef4444; }
#status .dot.connecting { background: #f59e0b; }

#bottom { position: absolute; bottom: 0; left: 0; right: 0; }
#tabs { display: flex; gap: 2px; padding: 4px 12px; background: rgba(0,0,0,.3); }
#tabs button { flex: 1; padding: 6px; border: none; background: transparent; color: #94a3b8; font-weight: 600; font-size: 12px; border-radius: 6px; cursor: pointer; }
#tabs button.active { background: rgba(255,255,255,.08); color: #e2e8f0; }
#side { height: 140px; overflow-y: auto; background: rgba(0,0,0,.2); }

#participants { padding: 6px 12px; display: flex; flex-direction: column; gap: 4px; }
.p { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,.04); border-radius: 8px; }
.av { width: 28px; height: 28px; border-radius: 14px; background: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; color: #fff; flex-shrink: 0; }
.info { flex: 1; min-width: 0; }
.name { font-size: 12px; font-weight: 600; }
.badges { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 2px; }
.badge { font-size: 9px; padding: 1px 6px; border-radius: 6px; font-weight: 600; }
.badge.mic-on { background: #22c55e33; color: #22c55e; }
.badge.mic-off { background: #ef444433; color: #ef4444; }
.badge.hand { background: #f59e0b33; color: #f59e0b; }
.badge.reaction { background: rgba(255,255,255,.1); }
.badge.host { background: #818cf833; color: #818cf8; }
.self { border: 1px solid #4f46e566; }

#chat { height: 140px; display: none; flex-direction: column; }
#msgs { flex: 1; overflow-y: auto; padding: 6px 12px; display: flex; flex-direction: column; gap: 4px; }
.msg { padding: 6px 10px; border-radius: 8px; background: rgba(255,255,255,.06); max-width: 85%; align-self: flex-start; }
.msg.self { align-self: flex-end; background: #4f46e544; }
.msg .sender { font-size: 10px; font-weight: 600; color: #818cf8; margin-bottom: 1px; }
.msg .text { font-size: 13px; }
.msg.system { background: #f59e0b22; align-self: center; }
.msg.system .text { font-size: 11px; color: #f59e0b; }
#chatBar { display: flex; gap: 6px; padding: 6px 12px; }
#chatBar input { flex: 1; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 8px 12px; color: #fff; font-size: 13px; outline: none; }
#chatBar input:focus { border-color: #4f46e5; }
#chatBar button { background: #4f46e5; border: none; border-radius: 16px; padding: 8px 14px; color: #fff; font-weight: 600; font-size: 12px; cursor: pointer; }

#controls { display: flex; justify-content: center; gap: 10px; padding: 8px 12px; padding-bottom: env(safe-area-inset-bottom, 8px); background: #0b1120; border-top: 1px solid rgba(255,255,255,.08); }
.ctrl { width: 40px; height: 40px; border-radius: 20px; background: rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; color: #e2e8f0; }
.ctrl.leave { background: #ef4444; color: #fff; }
#reactions { display: flex; gap: 4px; justify-content: center; padding: 4px 12px; position: absolute; bottom: 62px; left: 0; right: 0; }
#reactions button { background: rgba(255,255,255,.08); border: none; border-radius: 12px; padding: 4px 8px; font-size: 20px; cursor: pointer; }
`;

const ROOM_MARKUP = `
<div id="status"><span class="dot connecting" id="dot"></span><span id="stxt">Connecting...</span></div>
<div id="videos"></div>
<div id="bottom">
  <div id="tabs">
    <button class="active" id="tabParticipants" onclick="switchTab('participants')">Participants</button>
    <button id="tabChat" onclick="switchTab('chat')">Chat</button>
  </div>
  <div id="side">
    <div id="participants"></div>
    <div id="chat">
      <div id="msgs"></div>
      <div id="chatBar">
        <input id="chatInputField" placeholder="Type..." onkeydown="if(event.key==='Enter')sendChat()"/>
        <button onclick="sendChat()">Send</button>
      </div>
    </div>
  </div>
  <div id="reactions"></div>
  <div id="controls">
    <button class="ctrl" id="btnMic" onclick="toggleMic()">${ICON_MIC}</button>
    <button class="ctrl" id="btnCam" onclick="toggleCam()">${ICON_CAM}</button>
    <button class="ctrl" id="btnHand" onclick="toggleHand()">${ICON_HAND}</button>
    <button class="ctrl" onclick="showReactions()">${ICON_SMILE}</button>
    <button class="ctrl leave" onclick="doLeave()">${ICON_LEAVE}</button>
  </div>
</div>`;

function roomScript({ wsHost, authToken, sessionId }: BuildRoomHtmlOptions): string {
  return `
var RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
var REACTIONS = ['👍','❤️','🔥','🎉','😮','😂'];
var RECONNECT_DELAY_MS = 2000;
var MAX_RECONNECT_ATTEMPTS = 5;

var host = ${JSON.stringify(wsHost)};
var token = ${JSON.stringify(authToken)};
var sessionId = ${JSON.stringify(sessionId)};
var proto = host.indexOf('https') === 0 ? 'wss://' : 'ws://';

var ws = null;
var reconnectAttempts = 0;
var isLeaving = false;
var localStream = null;
var participants = {};
var peers = {};
var selfUserId = null;
var isMicOn = true, isCamOn = true, isHandRaised = false;

function connect() {
  var url = proto + host.replace(/^https?:\\/\\//, '') + '/ws/live/' + sessionId + '/';
  if (token) url += '?token=' + encodeURIComponent(token);

  ws = new WebSocket(url);
  setStatus('connecting', 'Connecting...');

  ws.onopen = function () {
    reconnectAttempts = 0;
    setStatus('connected', 'Connected');
    syncState();
  };
  ws.onmessage = handleSocketMessage;
  ws.onclose = function () {
    setStatus('disconnected', 'Disconnected');
    if (!isLeaving && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts += 1;
      setTimeout(connect, RECONNECT_DELAY_MS);
    }
  };
  ws.onerror = function () { ws.close(); };
}

function setStatus(cls, text) {
  document.getElementById('dot').className = 'dot ' + cls;
  document.getElementById('stxt').textContent = text;
}

function send(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function syncState() {
  send({ kind: 'participant_state', is_mic_on: isMicOn, is_camera_on: isCamOn, hand_raised: isHandRaised });
}

function handleSocketMessage(evt) {
  var data = JSON.parse(evt.data);
  var p = data.payload || {};
  var senderId = data.sender_id;

  switch (p.kind) {
    case 'participant_joined':
      if (!p.participant) return;
      onParticipantJoined(p.participant);
      break;
    case 'participant_left':
      if (!p.participant) return;
      onParticipantLeft(p.participant);
      break;
    case 'participant_state':
    case 'reaction':
      if (!p.participant) return;
      participants[p.participant.user] = Object.assign({}, participants[p.participant.user] || {}, p.participant);
      renderParticipants();
      break;
    case 'chat_message':
      if (!p.content) return;
      addChatMsg(p.content, p.user_name, senderId === selfUserId);
      break;
    case 'webrtc_offer':
    case 'webrtc_answer':
    case 'webrtc_ice_candidate':
      handleSignal(p.kind, senderId, p);
      break;
  }
}

function onParticipantJoined(participant) {
  var uid = participant.user;
  participants[uid] = participant;
  if (!selfUserId) selfUserId = uid;
  renderParticipants();
  addSystemMsg((participant.user_name || 'Someone') + ' joined');
  if (localStream && uid !== selfUserId) createOffer(uid);
}

function onParticipantLeft(participant) {
  var uid = participant.user;
  delete participants[uid];
  closePeer(uid);
  renderParticipants();
  addSystemMsg((participant.user_name || 'Someone') + ' left');
}

function handleSignal(kind, senderId, p) {
  if (!senderId || senderId === selfUserId || !participants[senderId]) return;
  if (kind === 'webrtc_offer' && p.description) handleOffer(senderId, p.description);
  if (kind === 'webrtc_answer' && p.description) handleAnswer(senderId, p.description);
  if (kind === 'webrtc_ice_candidate' && p.candidate) handleIce(senderId, p.candidate);
}

function startMedia() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    addVideoPlaceholder('local', 'Camera unavailable');
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(function (stream) {
      localStream = stream;
      addLocalVideo(stream);
      Object.keys(participants).forEach(function (uid) {
        if (uid !== selfUserId) createOffer(uid);
      });
    })
    .catch(function () {
      addVideoPlaceholder('local', 'Camera blocked');
    });
}

function stopMedia() {
  if (localStream) {
    localStream.getTracks().forEach(function (t) { t.stop(); });
    localStream = null;
  }
}

function getPeer(uid) {
  if (peers[uid]) return peers[uid];
  var peer = new RTCPeerConnection(RTC_CONFIG);
  peers[uid] = peer;
  if (localStream) localStream.getTracks().forEach(function (t) { peer.addTrack(t, localStream); });

  peer.onicecandidate = function (e) {
    if (e.candidate) send({ kind: 'webrtc_ice_candidate', target_user_id: uid, candidate: e.candidate.toJSON() });
  };
  peer.ontrack = function (e) {
    var stream = e.streams[0] || new MediaStream([e.track]);
    addRemoteVideo(uid, stream);
  };
  peer.onconnectionstatechange = function () {
    if (['disconnected', 'failed', 'closed'].indexOf(peer.connectionState) >= 0) closePeer(uid);
  };
  return peer;
}

function closePeer(uid) {
  if (peers[uid]) { peers[uid].close(); delete peers[uid]; }
  removeVideo(uid);
}

function closeAllPeers() {
  Object.keys(peers).forEach(closePeer);
}

function createOffer(uid) {
  var peer = getPeer(uid);
  peer.createOffer()
    .then(function (offer) { return peer.setLocalDescription(offer); })
    .then(function () { send({ kind: 'webrtc_offer', target_user_id: uid, description: peer.localDescription }); })
    .catch(function () {});
}

function handleOffer(uid, desc) {
  var peer = getPeer(uid);
  peer.setRemoteDescription(new RTCSessionDescription(desc))
    .then(function () { return peer.createAnswer(); })
    .then(function (answer) { return peer.setLocalDescription(answer); })
    .then(function () { send({ kind: 'webrtc_answer', target_user_id: uid, description: peer.localDescription }); })
    .catch(function () {});
}

function handleAnswer(uid, desc) {
  var peer = peers[uid];
  if (peer) peer.setRemoteDescription(new RTCSessionDescription(desc)).catch(function () {});
}

function handleIce(uid, candidate) {
  var peer = peers[uid];
  if (peer) peer.addIceCandidate(new RTCIceCandidate(candidate)).catch(function () {});
}

function addLocalVideo(stream) {
  var w = videoWrap('local');
  var vid = document.createElement('video');
  vid.autoplay = true; vid.muted = true; vid.playsInline = true; vid.srcObject = stream;
  w.appendChild(vid);
  w.appendChild(labelEl('You'));
  document.getElementById('videos').appendChild(w);
}

function addRemoteVideo(uid, stream) {
  removeVideo(uid);
  var w = videoWrap(uid);
  var vid = document.createElement('video');
  vid.autoplay = true; vid.playsInline = true; vid.srcObject = stream;
  w.appendChild(vid);
  var p = participants[uid];
  w.appendChild(labelEl((p && p.user_name) || 'Participant'));
  document.getElementById('videos').appendChild(w);
}

function addVideoPlaceholder(uid, label) {
  removeVideo(uid);
  var w = videoWrap(uid);
  w.style.display = 'flex'; w.style.alignItems = 'center'; w.style.justifyContent = 'center';
  w.style.color = '#64748b'; w.style.fontSize = '13px'; w.style.fontWeight = '600';
  w.textContent = label;
  document.getElementById('videos').appendChild(w);
}

function videoWrap(uid) {
  var w = document.createElement('div');
  w.className = 'video-wrap';
  w.id = 'v-' + uid;
  return w;
}

function removeVideo(uid) {
  var el = document.getElementById('v-' + uid);
  if (el) el.remove();
}

function labelEl(text) {
  var d = document.createElement('div');
  d.className = 'video-label';
  var dot = document.createElement('span');
  dot.className = 'dot on';
  d.appendChild(dot);
  d.appendChild(document.createTextNode(text));
  return d;
}

function renderParticipants() {
  var pl = document.getElementById('participants');
  var html = '';
  for (var k in participants) {
    var p = participants[k];
    var isSelf = p.user === selfUserId;
    var initials = (p.user_name || 'P').slice(0, 2).toUpperCase();
    var badges = '';
    if (p.role === 'HOST') badges += '<span class="badge host">Host</span>';
    badges += p.is_mic_on ? '<span class="badge mic-on">Mic</span>' : '<span class="badge mic-off">Muted</span>';
    if (p.hand_raised) badges += '<span class="badge hand">Hand</span>';
    if (p.last_reaction) badges += '<span class="badge reaction">' + esc(p.last_reaction) + '</span>';
    html += '<div class="p' + (isSelf ? ' self' : '') + '"><div class="av">' + esc(initials) + '</div>' +
      '<div class="info"><div class="name">' + esc(p.user_name || 'Participant') + '</div>' +
      '<div class="badges">' + badges + '</div></div></div>';
  }
  pl.innerHTML = html || '<div style="text-align:center;padding:12px;color:#64748b;font-size:13px">Waiting for participants...</div>';
}

function sendChat() {
  var inp = document.getElementById('chatInputField');
  if (!inp.value.trim()) return;
  send({ kind: 'chat_message', content: inp.value.trim() });
  inp.value = '';
}

function addChatMsg(text, sender, isSelf) {
  var msgs = document.getElementById('msgs');
  var d = document.createElement('div');
  d.className = 'msg' + (isSelf ? ' self' : '');
  d.innerHTML = '<div class="sender">' + (isSelf ? 'You' : esc(sender || 'Participant')) + '</div><div class="text">' + esc(text) + '</div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function addSystemMsg(text) {
  var msgs = document.getElementById('msgs');
  var d = document.createElement('div');
  d.className = 'msg system';
  d.innerHTML = '<div class="text">' + esc(text) + '</div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function showReactions() {
  var r = document.getElementById('reactions');
  r.innerHTML = REACTIONS.map(function (em) {
    return '<button onclick="sendReaction(\\'' + em + '\\')">' + em + '</button>';
  }).join('') + '<button onclick="document.getElementById(\\'reactions\\').innerHTML=\\'\\'" style="background:#ef4444;color:#fff;padding:4px 8px;font-size:14px">X</button>';
}

function sendReaction(em) {
  send({ kind: 'reaction', reaction: em });
  document.getElementById('reactions').innerHTML = '';
}

function switchTab(tab) {
  document.getElementById('tabParticipants').className = tab === 'participants' ? 'active' : '';
  document.getElementById('tabChat').className = tab === 'chat' ? 'active' : '';
  document.getElementById('participants').style.display = tab === 'participants' ? 'flex' : 'none';
  document.getElementById('chat').style.display = tab === 'chat' ? 'flex' : 'none';
  document.getElementById('reactions').innerHTML = '';
}

function toggleMic() {
  isMicOn = !isMicOn;
  document.getElementById('btnMic').style.opacity = isMicOn ? '1' : '.4';
  if (localStream) localStream.getAudioTracks().forEach(function (t) { t.enabled = isMicOn; });
  syncState();
}

function toggleCam() {
  isCamOn = !isCamOn;
  document.getElementById('btnCam').style.opacity = isCamOn ? '1' : '.4';
  if (localStream) localStream.getVideoTracks().forEach(function (t) { t.enabled = isCamOn; });
  syncState();
}

function toggleHand() {
  isHandRaised = !isHandRaised;
  document.getElementById('btnHand').style.opacity = isHandRaised ? '1' : '.4';
  syncState();
}

function doLeave() {
  isLeaving = true;
  closeAllPeers();
  stopMedia();
  if (ws) ws.close();
  postToNative({ type: 'leave' });
}

function postToNative(msg) {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

connect();
startMedia();
`;
}
