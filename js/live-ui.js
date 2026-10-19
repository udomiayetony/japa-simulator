'use strict';
// Screens for Live London: sign up and log in, profile setup, and the Chat,
// People and City tabs. Uses helpers from game.js ($, esc, money, openModal...).

const LiveUI = (() => {
  const TABS = ['chat', 'people', 'city'];
  const ago = (iso) => {
    const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'now';
    if (s < 3600) return `${Math.round(s / 60)}m`;
    if (s < 86400) return `${Math.round(s / 3600)}h`;
    return `${Math.round(s / 86400)}d`;
  };
  const who = (p) => (p ? `${flagOf(p.country || 'GB')} ${esc(p.display_name || p.name || p.username)}` : 'Someone');
  const tick = (p) => (p && p.verified ? ' <span class="verified" title="Verified creator">✔</span>' : '');
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'); };
  async function run(promise, okMsg) {
    const res = await promise;
    if (res && res.error) { toast(Online.errText(res.error)); return false; }
    if (okMsg) toast(okMsg);
    return true;
  }

  // ------------------------------------------------------------ title screen

  function renderTitle() {
    const el = $('#titleOnline');
    if (!el) return;
    if (!Online.enabled()) { el.innerHTML = ''; return; }
    if (Online.needsProfile()) {
      el.innerHTML = `<p>Almost there: pick your London username.</p><button class="btn white" id="finishProfile">Finish your profile</button>`;
      $('#finishProfile').onclick = showProfileSetup;
    } else if (Online.signedIn()) {
      const p = Online.profile();
      el.innerHTML = `<p class="signed-in">${flagOf(p.country)} Signed in as <b>@${esc(p.username)}</b>. Your game saves to the cloud and you will see other Londoners live.</p>
        <button class="link-btn" id="signOutBtn">Sign out</button>`;
      $('#signOutBtn').onclick = async () => { await Online.signOut(); renderTitle(); };
    } else {
      el.innerHTML = '<p>A free account keeps your Londoner safe in the cloud and puts you in the city with everyone else. You must be 18 or older.</p>';
    }
  }

  function showAuth(mode) {
    const signup = mode === 'signup';
    openModal(`
      <h2>${signup ? 'Create your account' : 'Welcome back'}</h2>
      <p>${signup ? 'Free. Your Londoner saves to the cloud, and you can chat, make friends and vote for Mayor.' : 'Log in to pick up where you left off.'}</p>
      <form id="authForm" class="form" novalidate>
        <label class="field"><span>Email</span><input id="authEmail" type="email" autocomplete="email" required></label>
        <label class="field"><span>Password</span><input id="authPassword" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required></label>
        ${signup ? '<label class="check"><input id="authAdult" type="checkbox"> I am 18 or older</label><p class="fine">By signing up you agree to play nicely: no hate, harassment or spam. You can report or block anyone.</p>' : ''}
        <p class="form-error" id="authError" role="alert"></p>
        <button class="btn green big" type="submit">${signup ? 'Create account' : 'Log in'}</button>
      </form>
      <div class="choices">
        <button class="link-btn" id="authSwitch">${signup ? 'I already have an account' : 'New here? Sign up free'}</button>
        ${signup ? '' : '<button class="link-btn" id="authForgot">Forgot password?</button>'}
      </div>`);
    const err = (m) => { $('#authError').textContent = m; };
    $('#authSwitch').onclick = () => showAuth(signup ? 'login' : 'signup');
    if (!signup) $('#authForgot').onclick = async () => {
      const email = $('#authEmail').value.trim();
      if (!email) return err('Type your email first, then tap "Forgot password?" again.');
      const { error } = await Online.resetPassword(email);
      err(error ? Online.errText(error) : 'Check your inbox for a link to reset your password.');
    };
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      const email = $('#authEmail').value.trim();
      const password = $('#authPassword').value;
      if (!email.includes('@')) return err('Enter a valid email address.');
      if (password.length < 8) return err('Passwords need at least 8 characters.');
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      if (signup) {
        if (!$('#authAdult').checked) { btn.disabled = false; return err('You must be 18 or older to play.'); }
        const res = await Online.signUp(email, password, true);
        btn.disabled = false;
        if (res.error) return err(Online.errText(res.error));
        if (res.needsConfirm) {
          openModal(`<h2>Check your email</h2><p>We sent a confirmation link to <b>${esc(email)}</b>. Open it on this device, then come back and log in.</p><div class="choices"><button class="btn primary" data-close>OK</button></div>`);
          $('[data-close]').onclick = () => { closeModal(); renderTitle(); };
          return;
        }
      } else {
        const res = await Online.signIn(email, password);
        btn.disabled = false;
        if (res.error) return err(Online.errText(res.error));
      }
      closeModal();
    };
    setTimeout(() => $('#authEmail') && $('#authEmail').focus(), 50);
  }

  function showProfileSetup() {
    const suggested = (typeof create !== 'undefined' && create.name) || (S && S.name) || '';
    openModal(`
      <h2>Your London username</h2>
      <p>This is how other players see you in chat and at City Hall.</p>
      <form id="profileForm" class="form" novalidate>
        <label class="field"><span>Username</span><input id="pfUser" maxlength="20" placeholder="e.g. peckham_queen" autocomplete="username"></label>
        <label class="field"><span>Display name</span><input id="pfName" maxlength="24" value="${esc(suggested)}"></label>
        <p class="form-error" id="pfError" role="alert"></p>
        <button class="btn green big" type="submit">Save</button>
      </form>`);
    $('#profileForm').onsubmit = async (e) => {
      e.preventDefault();
      const username = $('#pfUser').value.trim();
      const displayName = $('#pfName').value.trim() || username;
      if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) { $('#pfError').textContent = 'Usernames are 3 to 20 letters, numbers or underscores.'; return; }
      const look = S ? S.look : (typeof lookFromCreate === 'function' ? lookFromCreate() : {});
      const country = S ? S.country : (create.country || 'GB');
      const life = S ? S.bg : create.bg;
      const res = await Online.createProfile({ username, displayName, country, look, life });
      if (res.error) { $('#pfError').textContent = Online.errText(res.error); return; }
      closeModal();
      toast(`Welcome to Live London, @${username}!`);
      if (S) { Online.pushSaveNow(S); Online.joinCity(S.loc); }
      renderTitle();
    };
    setTimeout(() => $('#pfUser') && $('#pfUser').focus(), 50);
  }

  // ------------------------------------------------------------ tabs

  function tabHTML(tab) {
    if (tab === 'chat') return chatHTML();
    if (tab === 'people') return Online.state.conversation ? conversationHTML() : peopleHTML();
    return cityHTML();
  }

  function messageHTML(m) {
    const p = Online.profileOf(m.user_id);
    const mine = Online.profile() && m.user_id === Online.profile().id;
    return `<li class="msg ${mine ? 'mine' : ''}">
      <div class="msg-head"><b>${who(p)}${tick(p)}</b><time>${ago(m.created_at)}</time>
        ${mine ? '' : `<button class="msg-more" data-more="${m.id}" data-user="${m.user_id}" aria-label="Report or block">⋯</button>`}</div>
      <p>${esc(m.body)}</p></li>`;
  }
  function chatHTML() {
    const msgs = Online.state.messages.filter((m) => !Online.state.blocked.has(m.user_id));
    return `
      <div class="chat-head"><h3>💬 ${esc(LOCATIONS[S.loc].name)} chat</h3><small>Everyone here can see this.</small></div>
      <ol class="chat-list" id="chatList">${msgs.length ? msgs.map(messageHTML).join('') : '<li class="empty">No messages here yet. Say hello to the neighbourhood.</li>'}</ol>
      <form class="chat-form" id="chatForm"><input id="chatInput" maxlength="280" placeholder="Message ${esc(LOCATIONS[S.loc].name)}" autocomplete="off"><button class="btn green" type="submit">Send</button></form>`;
  }

  function personRow(p, actions) {
    return `<li class="person"><img class="avatar-img" src="${Avatar.portrait(p.look || {})}" alt=""><div><b>${who(p)}${tick(p)}</b>
      <small>@${esc(p.username)}${p.loc ? ` · ${esc(LOCATIONS[p.loc] ? LOCATIONS[p.loc].name : '')}` : ''}</small></div><div class="person-actions">${actions}</div></li>`;
  }
  function peopleHTML() {
    const st = Online.state;
    const me = Online.profile();
    const friendIds = new Set(st.friends.map((f) => f.id));
    const here = st.players.filter((p) => p.loc === S.loc && p.id !== me.id);
    const online = new Map(st.players.map((p) => [p.id, p]));
    const hereRows = here.map((p) => personRow(p, `
      ${friendIds.has(p.id) ? `<button class="mini" data-dm="${p.id}">Message</button>` : st.outgoing.includes(p.id) ? '<span class="mini muted">Requested</span>' : `<button class="mini green" data-addfriend="${p.id}">Add friend</button>`}
      ${st.following.has(p.id) ? `<button class="mini" data-unfollow="${p.id}">Following</button>` : `<button class="mini" data-follow="${p.id}">Follow</button>`}`)).join('');
    const reqRows = st.incoming.map((p) => personRow(p, `<button class="mini green" data-accept="${p.id}">Accept</button><button class="mini" data-decline="${p.id}">Decline</button>`)).join('');
    const friendRows = st.friends.map((f) => {
      const live = online.get(f.id);
      return personRow({ ...f, loc: live && live.loc }, `${live ? '<span class="live-dot" title="Online"></span>' : ''}<button class="mini" data-dm="${f.id}">Message</button>`);
    }).join('');
    const creator = me.account_type !== 'player';
    return `
      <div class="creator-card">
        <div><b>${creator ? '⭐ Creator' : 'Become a creator'}</b><small>${creator ? `${st.followers} followers. Brands will be able to find you for collaborations (coming in Phase 4).` : 'Get discovered by brands for paid collaborations later on.'}</small></div>
        ${creator ? '' : '<button class="mini green" id="becomeCreator">Opt in</button>'}
      </div>
      ${st.incoming.length ? `<h4>Friend requests</h4><ul class="people">${reqRows}</ul>` : ''}
      <h4>Here now · ${esc(LOCATIONS[S.loc].name)}</h4>
      <ul class="people">${hereRows || '<li class="empty">Nobody else is here right now. Try a busy spot like Oxford Circus or Soho.</li>'}</ul>
      <h4>Friends${st.unread ? ` · ${st.unread} unread` : ''}</h4>
      <ul class="people">${friendRows || '<li class="empty">Add people you meet to message them privately.</li>'}</ul>`;
  }
  function conversationHTML() {
    const c = Online.state.conversation;
    const f = Online.profileOf(c.with) || {};
    const me = Online.profile().id;
    return `
      <div class="chat-head"><button class="mini" id="dmBack">← Back</button><h3>${who(f)}</h3>
        <button class="msg-more" data-more="dm" data-user="${c.with}" aria-label="Report or block">⋯</button></div>
      <ol class="chat-list" id="dmList">${c.messages.length ? c.messages.map((m) => `<li class="msg ${m.sender === me ? 'mine' : ''}"><p>${esc(m.body)}</p><time>${ago(m.created_at)}</time></li>`).join('') : '<li class="empty">Say hello.</li>'}</ol>
      <form class="chat-form" id="dmForm"><input id="dmInput" maxlength="500" placeholder="Message ${esc(f.display_name || '')}" autocomplete="off"><button class="btn green" type="submit">Send</button></form>`;
  }

  function cityHTML() {
    const hall = Online.state.hall;
    if (!hall) return '<p class="empty">Loading City Hall…</p>';
    const me = Online.profile();
    const t = hall.term;
    const daysLeft = Math.max(0, Math.ceil((new Date(t.ends_at).getTime() - Date.now()) / 86400000));
    const pol = t.policy && Online.POLICIES[t.policy];
    const mayor = hall.mayor;
    const isMayor = mayor && mayor.id === me.id;
    const policyOptions = Object.entries(Online.POLICIES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}: ${v.desc}</option>`).join('');
    const props = Online.state.properties;
    return `
      <div class="hall">
        <h4>🏛️ Mayor of London</h4>
        ${mayor ? `<div class="mayor"><img class="avatar-img" src="${Avatar.portrait(mayor.look || {})}" alt=""><div><b>${who(mayor)}</b><small>@${esc(mayor.username)}</small>
          ${pol ? `<span class="policy-pill">${pol.icon} ${pol.label}</span><small>${pol.desc}</small>` : ''}</div></div>
          ${t.announcement ? `<p class="announce">"${esc(t.announcement)}"</p>` : ''}
          ${isMayor ? `<form class="chat-form" id="announceForm"><input id="announceInput" maxlength="140" placeholder="Post an announcement to all of London"><button class="btn green" type="submit">Post</button></form>` : ''}`
        : '<p class="empty">London has no Mayor yet. Stand in the election below and the winner takes office when this term ends.</p>'}
        <h4>Election · closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</h4>
        <ul class="people">${hall.candidates.length ? hall.candidates.map((c) => personRow(c, `
          <span class="votes">${c.votes} vote${c.votes === 1 ? '' : 's'}</span>
          ${hall.my_vote === c.id ? '<span class="mini muted">Your vote</span>' : `<button class="mini green" data-vote="${c.id}">Vote</button>`}`)).join('') : '<li class="empty">No candidates yet. Be the first.</li>'}</ul>
        ${hall.candidates.map((c) => `<p class="slogan">${flagOf(c.country)} <b>${esc(c.display_name)}</b>: "${esc(c.slogan)}" · ${Online.POLICIES[c.policy].icon} ${Online.POLICIES[c.policy].label}</p>`).join('')}
        <details class="stand">
          <summary>Stand for Mayor</summary>
          <form class="form" id="standForm">
            <label class="field"><span>Your slogan</span><input id="standSlogan" maxlength="80" placeholder="e.g. Free Oyster cards for everyone"></label>
            <label class="field"><span>Your policy if you win</span><select id="standPolicy">${policyOptions}</select></label>
            <button class="btn green" type="submit">Stand for Mayor</button>
          </form>
        </details>
      </div>
      <h4>🏘️ Property in ${esc(LOCATIONS[S.loc].name)}</h4>
      <ul class="props">${props.length ? props.map((p) => {
        const owner = p.owner_id && Online.profileOf(p.owner_id);
        const mine = p.owner_id === me.id;
        return `<li class="prop"><div><b>${esc(p.name)}</b><small>${money(p.price)} · earns ${money(p.weekly_rent)}/week${owner ? ` · owned by ${mine ? 'you' : who(owner)}` : ''}</small></div>
          ${mine ? `<button class="mini" data-sell="${p.id}">Sell (${money(Math.round(p.price * 0.8))})</button>` : p.owner_id ? '<span class="mini muted">Sold</span>' : `<button class="mini green" data-buy="${p.id}" ${S.money < p.price ? 'disabled title="Not enough money"' : ''}>Buy</button>`}</li>`;
      }).join('') : '<li class="empty">No listings in this area.</li>'}</ul>
      ${Online.weeklyRentIncome() ? `<p class="hint">Your properties earn ${money(Online.weeklyRentIncome())} every Monday.</p>` : ''}`;
  }

  // ------------------------------------------------------------ tab events

  function bindTab(tab, sheet) {
    if (tab === 'chat') {
      Online.openChat(S.loc);
      scrollDown('#chatList');
      $('#chatForm').onsubmit = async (e) => {
        e.preventDefault();
        const input = $('#chatInput');
        const text = input.value;
        if (!text.trim()) return;
        input.value = '';
        if (!(await run(Online.sendMessage(text)))) input.value = text;
        input.focus();
      };
    }
    if (tab === 'people') {
      if (Online.state.conversation) {
        scrollDown('#dmList');
        $('#dmBack').onclick = () => { Online.closeConversation(); renderSheet(); };
        $('#dmForm').onsubmit = async (e) => {
          e.preventDefault();
          const input = $('#dmInput');
          const text = input.value;
          if (!text.trim()) return;
          input.value = '';
          if (!(await run(Online.sendDM(text)))) input.value = text;
          input.focus();
        };
      }
      const on = (attr, fn) => sheet.querySelectorAll(`[${attr}]`).forEach((b) => { b.onclick = () => fn(b.getAttribute(attr), b); });
      on('data-addfriend', (id) => run(Online.addFriend(id), 'Friend request sent'));
      on('data-accept', (id) => run(Online.acceptFriend(id), 'You are now friends'));
      on('data-decline', (id) => Online.removeFriend(id));
      on('data-follow', (id) => run(Online.follow(id)));
      on('data-unfollow', (id) => Online.unfollow(id));
      on('data-dm', async (id) => { await Online.openConversation(id); renderSheet(); });
      const bc = $('#becomeCreator');
      if (bc) bc.onclick = () => run(Online.becomeCreator(), 'You are now a creator ⭐');
    }
    if (tab === 'city') {
      Online.refreshHall();
      Online.refreshProperties(S.loc);
      const on = (attr, fn) => sheet.querySelectorAll(`[${attr}]`).forEach((b) => { b.onclick = () => fn(b.getAttribute(attr), b); });
      on('data-vote', (id) => run(Online.vote(id), 'Vote cast 🗳️'));
      on('data-buy', async (id, b) => {
        b.disabled = true;
        const res = await Online.buy(+id, S);
        if (res.error) { toast(Online.errText(res.error)); b.disabled = false; return; }
        S.money = res.money;
        const p = Online.state.owned.find((x) => x.id === +id);
        log(`🏘️ You bought ${p ? p.name : 'a property'}. It earns rent every Monday.`, 'good');
        save(); render();
      });
      on('data-sell', async (id) => {
        const res = await Online.sell(+id, S);
        if (res.error) { toast(Online.errText(res.error)); return; }
        S.money = res.money;
        log('🏘️ You sold a property for 80% of its price.');
        save(); render();
      });
      const sf = $('#standForm');
      if (sf) sf.onsubmit = async (e) => {
        e.preventDefault();
        const slogan = $('#standSlogan').value.trim();
        if (!slogan) return toast('Write a slogan first.');
        run(Online.standForMayor(slogan, $('#standPolicy').value), 'You are on the ballot 🗳️');
      };
      const af = $('#announceForm');
      if (af) af.onsubmit = async (e) => {
        e.preventDefault();
        const text = $('#announceInput').value.trim();
        if (text) run(Online.announce(text), 'Announcement posted to all of London');
      };
    }
    sheet.querySelectorAll('[data-more]').forEach((b) => { b.onclick = () => moreMenu(b.dataset.user, b.dataset.more); });
  }

  function moreMenu(userId, ref) {
    const p = Online.profileOf(userId);
    openModal(`
      <h2>${who(p)}</h2>
      <p>Report anything hateful, harassing or spammy. Blocking hides them from you and stops them messaging you.</p>
      <label class="field"><span>Reason (for reports)</span><input id="reportReason" maxlength="300" placeholder="What happened?"></label>
      <div class="choices">
        <button class="btn danger" id="reportBtn">Report</button>
        <button class="btn danger" id="blockBtn">Block</button>
        <button class="btn" data-close>Cancel</button>
      </div>`);
    $('[data-close]').onclick = closeModal;
    $('#reportBtn').onclick = async () => {
      const reason = $('#reportReason').value.trim() || 'No reason given';
      const ids = ref === 'dm' ? {} : { messageId: +ref };
      if (await run(Online.report(userId, reason, ids), 'Thanks. We will review this report.')) closeModal();
    };
    $('#blockBtn').onclick = async () => {
      if (await run(Online.block(userId), 'Blocked')) {
        if (Online.state.conversation && Online.state.conversation.with === userId) Online.closeConversation();
        closeModal(); renderSheet();
      }
    };
  }

  function scrollDown(sel) { const el = $(sel); if (el) el.scrollTop = el.scrollHeight; }

  // ------------------------------------------------------------ live updates

  function handle(kind) {
    if (kind === 'auth') {
      renderTitle();
      if (Online.needsProfile() && $('#modal').classList.contains('hidden')) showProfileSetup();
      if (S && !$('#game').classList.contains('hidden')) {
        if (Online.signedIn()) Online.joinCity(S.loc);
        render();
      }
      return;
    }
    if (!S || $('#game').classList.contains('hidden')) return;
    if (kind === 'players') {
      const me = Online.profile();
      World.setPlayers(Online.state.players.filter((p) => !me || p.id !== me.id));
      const live = $('.online-count');
      if (live) live.textContent = `${Online.state.players.length.toLocaleString()} online`;
      if (ui.tab === 'people' && !ui.target && !Online.state.conversation && !typing()) renderSheet();
      return;
    }
    if (kind === 'chat' && ui.tab === 'chat' && !ui.target) {
      const list = $('#chatList');
      const msgs = Online.state.messages.filter((m) => !Online.state.blocked.has(m.user_id));
      if (list) { list.innerHTML = msgs.map(messageHTML).join('') || '<li class="empty">No messages here yet.</li>'; scrollDown('#chatList'); list.querySelectorAll('[data-more]').forEach((b) => { b.onclick = () => moreMenu(b.dataset.user, b.dataset.more); }); }
      return;
    }
    if (kind === 'dms' && ui.tab === 'people' && Online.state.conversation && !ui.target) {
      const list = $('#dmList');
      if (list) {
        const me = Online.profile().id;
        list.innerHTML = Online.state.conversation.messages.map((m) => `<li class="msg ${m.sender === me ? 'mine' : ''}"><p>${esc(m.body)}</p><time>${ago(m.created_at)}</time></li>`).join('');
        scrollDown('#dmList');
      }
      return;
    }
    if (kind === 'hall') { if (!typing()) render(); return; }
    if (!typing() && !ui.target && ((kind === 'friends' || kind === 'dms') && ui.tab === 'people' || kind === 'props' && ui.tab === 'city' || kind === 'profile')) renderSheet();
    else if (kind === 'friends' || kind === 'dms') {
      const badge = Online.state.unread + Online.state.incoming.length;
      const tabBtn = document.querySelector('[data-tab="people"]');
      if (tabBtn) { const b = tabBtn.querySelector('.badge'); if (badge && !b) tabBtn.insertAdjacentHTML('beforeend', `<b class="badge">${badge}</b>`); else if (b) { if (badge) b.textContent = badge; else b.remove(); } }
    }
  }

  return { TABS, tabHTML, bindTab, handle, renderTitle, showAuth, showProfileSetup };
})();
