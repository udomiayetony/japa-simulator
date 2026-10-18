'use strict';
// Live London (Phase 2): accounts, cloud saves, live players, place chat, friends,
// private messages, City Hall (Mayor elections) and the property market, on Supabase.
// Everything here is optional: with no config or no connection the game plays offline.

const Online = (() => {
  let sb = null;
  let user = null;
  let profile = null;
  let needsProfile = false;
  let city = null;
  let chatChannel = null;
  let inbox = null;
  let hallChannel = null;
  let chatPlace = null;
  let pushTimer = null;
  let myLoc = null;
  let readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });
  const listeners = new Set();
  const profileCache = new Map();
  const state = {
    players: [],
    messages: [],
    hall: null,
    friends: [],
    incoming: [],
    outgoing: [],
    blocked: new Set(),
    following: new Set(),
    followers: 0,
    unread: 0,
    conversation: null,
    properties: [],
    owned: [],
  };

  const POLICIES = {
    fare_freeze: { label: 'Fare freeze', icon: '🚇', desc: 'Tube and bus fares 25% cheaper for everyone.' },
    rent_cap: { label: 'Rent cap', icon: '🏠', desc: 'Landlords cannot raise rent.' },
    wage_rise: { label: 'London wage rise', icon: '💷', desc: 'Everyone earns 10% more per shift.' },
    clean_air: { label: 'Clean air zone', icon: '🌿', desc: 'Cabs cost £3 more; walking and cycling are more fun.' },
  };

  const emit = (kind) => listeners.forEach((f) => { try { f(kind); } catch (e) { console.error(e); } });
  const errText = (error) => (error && (error.message || error.error_description)) || 'Something went wrong. Try again.';

  // ------------------------------------------------------------ setup & auth

  async function init() {
    const cfg = window.LH_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.SupabaseLib) { readyResolve(); return; }
    try {
      sb = window.SupabaseLib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
      const { data } = await sb.auth.getSession();
      if (data && data.session) await signedIn(data.session.user);
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') signedOut();
        else if (session && session.user && (!user || user.id !== session.user.id)) signedIn(session.user);
      });
    } catch (e) {
      console.warn('Live London is unavailable:', e);
      sb = null;
    }
    readyResolve();
    emit('auth');
  }

  async function signedIn(u) {
    user = u;
    const { data } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
    profile = data || null;
    needsProfile = !profile;
    if (profile) await afterProfile();
    emit('auth');
  }

  function signedOut() {
    user = null; profile = null; needsProfile = false;
    for (const ch of [city, chatChannel, inbox, hallChannel]) if (ch) sb.removeChannel(ch);
    city = chatChannel = inbox = hallChannel = null;
    clearInterval(hallTimer);
    chatPlace = null;
    Object.assign(state, { players: [], messages: [], hall: null, friends: [], incoming: [], outgoing: [], blocked: new Set(), following: new Set(), unread: 0, conversation: null, owned: [] });
    emit('auth');
    emit('players');
  }

  async function afterProfile() {
    profileCache.set(profile.id, profile);
    await Promise.all([loadBlocks(), loadFriends(), loadHall(), loadOwned(), loadFollows()]);
    subscribeInbox();
    subscribeHall();
    clearInterval(hallTimer);
    hallTimer = setInterval(() => { if (!document.hidden) refreshHall(25000); }, 30000);
  }

  async function signUp(email, password, isAdult) {
    if (!isAdult) return { error: { message: 'You must be 18 or older to play online.' } };
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { is_adult: true }, emailRedirectTo: location.origin + location.pathname },
    });
    if (error) return { error };
    return { needsConfirm: !data.session };
  }
  async function signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error };
  }
  async function resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    return { error };
  }
  async function signOut() { await sb.auth.signOut(); signedOut(); }

  async function createProfile({ username, displayName, country, look, life }) {
    const row = { id: user.id, username, display_name: displayName, country, look: look || {}, life, is_adult: true };
    const { data, error } = await sb.from('profiles').insert(row).select().single();
    if (error) {
      if (error.code === '23505') return { error: { message: 'That username is taken. Try another.' } };
      if (error.code === '23514') return { error: { message: 'Usernames are 3 to 20 letters, numbers or underscores.' } };
      return { error };
    }
    profile = data; needsProfile = false;
    await afterProfile();
    emit('auth');
    return {};
  }

  async function updateProfile(fields) {
    if (!profile) return;
    const { data, error } = await sb.from('profiles').update(fields).eq('id', profile.id).select().single();
    if (!error && data) { profile = data; profileCache.set(data.id, data); }
    return { error };
  }

  async function becomeCreator() {
    const { error } = await sb.rpc('become_creator');
    if (!error) profile.account_type = profile.account_type === 'player' ? 'creator' : profile.account_type;
    emit('profile');
    return { error };
  }

  // ------------------------------------------------------------ cloud saves

  async function pullSave() {
    if (!profile) return null;
    const { data } = await sb.from('saves').select('data, updated_at').eq('user_id', profile.id).maybeSingle();
    return data ? data.data : null;
  }
  function pushSave(game) {
    if (!profile || !game) return;
    clearTimeout(pushTimer);
    const snapshot = JSON.parse(JSON.stringify(game));
    pushTimer = setTimeout(async () => {
      await sb.from('saves').upsert({ user_id: profile.id, data: snapshot, updated_at: new Date().toISOString() });
    }, 2500);
  }
  async function pushSaveNow(game) {
    if (!profile || !game) return;
    clearTimeout(pushTimer);
    await sb.from('saves').upsert({ user_id: profile.id, data: game, updated_at: new Date().toISOString() });
  }

  // ------------------------------------------------------------ live players (presence)

  function me() {
    return {
      id: profile.id, username: profile.username, name: profile.display_name, country: profile.country,
      look: profile.look, life: profile.life, verified: profile.verified, creator: profile.account_type !== 'player', loc: myLoc,
    };
  }
  function joinCity(loc) {
    if (!profile) return;
    myLoc = loc;
    if (city) { city.track(me()); return; }
    city = sb.channel('london', { config: { presence: { key: profile.id } } });
    city.on('presence', { event: 'sync' }, () => {
      const seen = new Map();
      for (const metas of Object.values(city.presenceState())) {
        const m = metas[metas.length - 1];
        if (m && m.id && !state.blocked.has(m.id)) seen.set(m.id, m);
      }
      state.players = [...seen.values()];
      emit('players');
    });
    city.subscribe((status) => { if (status === 'SUBSCRIBED') city.track(me()); });
  }
  function moveTo(loc) {
    myLoc = loc;
    if (city) city.track(me());
    if (chatPlace && chatPlace !== loc) openChat(loc);
  }
  function leaveCity() {
    if (city) { sb.removeChannel(city); city = null; }
    state.players = [];
    emit('players');
  }

  // ------------------------------------------------------------ profiles for chat names

  async function profilesFor(ids) {
    const missing = [...new Set(ids)].filter((id) => !profileCache.has(id));
    if (missing.length) {
      const { data } = await sb.from('profiles').select('id, username, display_name, country, look, verified, account_type').in('id', missing);
      for (const p of data || []) profileCache.set(p.id, p);
    }
    return ids.map((id) => profileCache.get(id)).filter(Boolean);
  }

  // ------------------------------------------------------------ place chat

  async function openChat(place) {
    if (!profile) return;
    if (chatPlace === place && chatChannel) return;
    if (chatChannel) sb.removeChannel(chatChannel);
    chatPlace = place;
    const { data } = await sb.from('messages').select('id, user_id, body, created_at')
      .eq('place', place).order('created_at', { ascending: false }).limit(40);
    const rows = (data || []).reverse();
    await profilesFor(rows.map((r) => r.user_id));
    state.messages = rows;
    emit('chat');
    chatChannel = sb.channel(`chat:${place}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `place=eq.${place}` }, async (payload) => {
        const row = payload.new;
        if (state.messages.some((m) => m.id === row.id)) return;
        await profilesFor([row.user_id]);
        state.messages = [...state.messages, row].slice(-60);
        emit('chat');
      })
      .subscribe();
  }
  async function sendMessage(body) {
    const text = body.trim();
    if (!text || !chatPlace) return {};
    const { data, error } = await sb.from('messages').insert({ place: chatPlace, body: text }).select('id, user_id, body, created_at').single();
    if (!error && data && !state.messages.some((m) => m.id === data.id)) {
      state.messages = [...state.messages, data].slice(-60);
      emit('chat');
    }
    return { error };
  }

  // ------------------------------------------------------------ safety: reports and blocks

  async function report(userId, reason, ids = {}) {
    const { error } = await sb.from('reports').insert({ reported_user: userId, reason, message_id: ids.messageId || null, dm_id: ids.dmId || null });
    return { error };
  }
  async function loadBlocks() {
    const { data } = await sb.from('blocks').select('blocked');
    state.blocked = new Set((data || []).map((r) => r.blocked));
  }
  async function block(userId) {
    const { error } = await sb.from('blocks').insert({ blocker: profile.id, blocked: userId });
    if (!error) {
      state.blocked.add(userId);
      state.players = state.players.filter((p) => p.id !== userId);
      emit('players'); emit('chat'); emit('friends');
    }
    return { error };
  }

  // ------------------------------------------------------------ friends and follows

  async function loadFriends() {
    const { data } = await sb.from('friendships').select('*');
    const rows = data || [];
    const other = (r) => (r.requester === profile.id ? r.addressee : r.requester);
    await profilesFor(rows.map(other));
    state.friends = rows.filter((r) => r.status === 'accepted').map((r) => profileCache.get(other(r))).filter(Boolean);
    state.incoming = rows.filter((r) => r.status === 'pending' && r.addressee === profile.id).map((r) => profileCache.get(r.requester)).filter(Boolean);
    state.outgoing = rows.filter((r) => r.status === 'pending' && r.requester === profile.id).map((r) => r.addressee);
    emit('friends');
  }
  async function addFriend(userId) {
    const { error } = await sb.from('friendships').insert({ requester: profile.id, addressee: userId });
    await loadFriends();
    return { error: error && error.code === '23505' ? { message: 'You have already sent a request.' } : error };
  }
  async function acceptFriend(userId) {
    const { error } = await sb.from('friendships').update({ status: 'accepted' }).eq('requester', userId).eq('addressee', profile.id);
    await loadFriends();
    return { error };
  }
  async function removeFriend(userId) {
    await sb.from('friendships').delete().eq('requester', profile.id).eq('addressee', userId);
    await sb.from('friendships').delete().eq('requester', userId).eq('addressee', profile.id);
    await loadFriends();
  }
  async function loadFollows() {
    const [{ data }, { count }] = await Promise.all([
      sb.from('follows').select('followee').eq('follower', profile.id),
      sb.from('follows').select('follower', { count: 'exact', head: true }).eq('followee', profile.id),
    ]);
    state.following = new Set((data || []).map((r) => r.followee));
    state.followers = count || 0;
  }
  async function follow(userId) {
    const { error } = await sb.from('follows').insert({ follower: profile.id, followee: userId });
    if (!error) state.following.add(userId);
    emit('friends');
    return { error };
  }
  async function unfollow(userId) {
    await sb.from('follows').delete().eq('follower', profile.id).eq('followee', userId);
    state.following.delete(userId);
    emit('friends');
  }

  // ------------------------------------------------------------ private messages

  function subscribeInbox() {
    if (inbox) sb.removeChannel(inbox);
    inbox = sb.channel(`inbox:${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dms', filter: `recipient=eq.${profile.id}` }, (payload) => {
        const row = payload.new;
        if (state.conversation && state.conversation.with === row.sender) {
          state.conversation.messages.push(row);
          sb.from('dms').update({ read_at: new Date().toISOString() }).eq('id', row.id);
        } else {
          state.unread++;
        }
        emit('dms');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `addressee=eq.${profile.id}` }, () => loadFriends())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `requester=eq.${profile.id}` }, () => loadFriends())
      .subscribe();
    sb.from('dms').select('id', { count: 'exact', head: true }).eq('recipient', profile.id).is('read_at', null)
      .then(({ count }) => { state.unread = count || 0; emit('dms'); });
  }
  async function openConversation(friendId) {
    const a = profile.id, b = friendId;
    const { data } = await sb.from('dms').select('*')
      .or(`and(sender.eq.${a},recipient.eq.${b}),and(sender.eq.${b},recipient.eq.${a})`)
      .order('created_at', { ascending: true }).limit(80);
    state.conversation = { with: friendId, messages: data || [] };
    const unreadIds = (data || []).filter((m) => m.recipient === a && !m.read_at).map((m) => m.id);
    if (unreadIds.length) {
      await sb.from('dms').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
      state.unread = Math.max(0, state.unread - unreadIds.length);
    }
    emit('dms');
  }
  function closeConversation() { state.conversation = null; }
  async function sendDM(body) {
    const text = body.trim();
    if (!text || !state.conversation) return {};
    const { data, error } = await sb.from('dms').insert({ recipient: state.conversation.with, body: text }).select().single();
    if (!error && data) { state.conversation.messages.push(data); emit('dms'); }
    return { error };
  }

  // ------------------------------------------------------------ City Hall

  let hallAt = 0;
  let hallTimer = null;
  async function loadHall() {
    hallAt = Date.now();
    const { data, error } = await sb.rpc('city_hall');
    if (!error) { state.hall = data; emit('hall'); }
  }
  // Candidacies and vote counts are not pushed live, so refresh when someone looks.
  function refreshHall(maxAgeMs = 10000) {
    if (profile && Date.now() - hallAt > maxAgeMs) loadHall();
  }
  function subscribeHall() {
    if (hallChannel) sb.removeChannel(hallChannel);
    hallChannel = sb.channel('city-hall')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'terms' }, () => loadHall())
      .subscribe();
  }
  async function standForMayor(slogan, policy) {
    const { error } = await sb.rpc('stand_for_mayor', { p_slogan: slogan, p_policy: policy });
    await loadHall();
    return { error };
  }
  async function vote(candidateId) {
    const { error } = await sb.rpc('cast_vote', { p_candidate: candidateId });
    await loadHall();
    return { error };
  }
  async function announce(text) {
    const { error } = await sb.rpc('set_announcement', { p_text: text });
    await loadHall();
    return { error };
  }
  function policy() { return state.hall && state.hall.term ? state.hall.term.policy : null; }

  // ------------------------------------------------------------ property market

  let propsAt = 0;
  let propsPlace = null;
  async function loadProperties(place) {
    propsAt = Date.now();
    propsPlace = place;
    const { data } = await sb.from('properties').select('*').eq('place', place).order('price');
    await profilesFor((data || []).map((p) => p.owner_id).filter(Boolean));
    state.properties = data || [];
    emit('props');
  }
  async function loadOwned() {
    const { data } = await sb.from('properties').select('*').eq('owner_id', profile.id);
    state.owned = data || [];
  }
  // Purchases are checked and paid from the cloud save, so push the latest save first.
  async function buy(id, game) {
    await pushSaveNow(game);
    const { data, error } = await sb.rpc('buy_property', { p_id: id });
    await Promise.all([loadOwned(), loadProperties(chatPlace || myLoc)]);
    return { error, money: data ? Number(data.money) : null };
  }
  async function sell(id, game) {
    await pushSaveNow(game);
    const { data, error } = await sb.rpc('sell_property', { p_id: id });
    await Promise.all([loadOwned(), loadProperties(chatPlace || myLoc)]);
    return { error, money: data ? Number(data.money) : null };
  }
  // Other players buy and sell too, so refresh listings when someone looks.
  function refreshProperties(place, maxAgeMs = 10000) {
    if (profile && (place !== propsPlace || Date.now() - propsAt > maxAgeMs)) loadProperties(place);
  }
  const weeklyRentIncome = () => state.owned.reduce((a, p) => a + p.weekly_rent, 0);

  // ------------------------------------------------------------ headline of the day

  async function todaysHeadline() {
    if (!sb) return null;
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await sb.from('headlines').select('text').eq('day', day).maybeSingle();
    return data ? data.text : null;
  }

  return {
    POLICIES, state, ready, init, errText,
    enabled: () => !!sb,
    signedIn: () => !!profile,
    needsProfile: () => needsProfile,
    user: () => user,
    profile: () => profile,
    on: (f) => listeners.add(f),
    signUp, signIn, signOut, resetPassword, createProfile, updateProfile, becomeCreator,
    pullSave, pushSave, pushSaveNow,
    joinCity, moveTo, leaveCity,
    openChat, sendMessage, profileOf: (id) => profileCache.get(id),
    report, block,
    loadFriends, addFriend, acceptFriend, removeFriend, follow, unfollow,
    openConversation, closeConversation, sendDM,
    loadHall, refreshHall, standForMayor, vote, announce, policy,
    loadProperties, refreshProperties, buy, sell, weeklyRentIncome,
    todaysHeadline,
  };
})();
