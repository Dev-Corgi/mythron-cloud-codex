const data = window.PHOBIES || [];
const $ = (id) => document.getElementById(id);
const grid = $('cardGrid');
const search = $('searchInput');
const rarity = $('rarityFilter');
const keys = $('keyFilter');
const movement = $('moveFilter');
const sort = $('sortSelect');
const levelRange = $('levelRange');
const rarityClass = (value) => String(value || '').toLowerCase().replace(/[^a-z]+/g, '-');
const numeric = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
const valueAtLevel = (value, level) => {
  const n = numeric(value);
  return n === null ? value : Math.round(n * (1 + 0.03 * (level - 1)));
};
const format = (value) => value === '' || value === null || value === undefined ? '' : String(value);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function fillFilter(select, values, label) {
  [...new Set(values.filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'en', {numeric:true})).forEach((value) => {
    const option = document.createElement('option'); option.value = value; option.textContent = label(value); select.append(option);
  });
}
fillFilter(rarity, data.map(d => d.rarity), v => v);
fillFilter(keys, data.map(d => d.keys), v => `${v} 키`);
fillFilter(movement, data.map(d => d.move_type), v => v);

function abilityCard(d, type, level) {
  const active = type === '액티브';
  const name = active ? d.active_name : d.passive_name;
  const description = active ? d.active_description : d.passive_description;
  if (!name && !description) return '';
  const items = [];
  const add = (label, value, scaled = false) => {
    if (value === '' || value === null || value === undefined) return;
    const shown = scaled ? valueAtLevel(value, level) : value;
    if (shown === '' || shown === null || shown === undefined) return;
    items.push(`<span class="detail-chip ${scaled ? 'damage' : ''}">${esc(label)} ${esc(shown)}</span>`);
  };
  if (active) {
    add('범위', d.effect_range); add('사거리', d.active_range); add('피해', d.active_attack, true); add('범위 피해', d.active_splash, true);
    add('치유', d.active_heal, true); add('전기', d.active_electric, true); add('독', d.active_poison, true); add('화염', d.active_fire, true); add('질병', d.active_disease, true);
    add('지속', d.active_duration); add('효과 지속', d.effect_duration); add('쿨다운', d.cooldown); add('해금', d.unlocking);
    add('이동', d.active_movement); add('흡혈', d.active_lifesteal, true); add('장애물', d.active_obstacle); add('버프', d.active_buff); add('디버프', d.active_debuff); add('함정', d.active_trap);
  } else {
    add('범위', d.passive_effect_range); add('추가 이동', d.passive_movement); add('치유', d.passive_heal, true); add('흡혈', d.passive_lifesteal, true);
    add('부활', d.passive_resurrect); add('피해', d.passive_attack, true); add('버프', d.passive_buff); add('반사', d.passive_reflect);
    add('전기', d.passive_electric, true); add('질병', d.passive_disease, true); add('지속', d.passive_duration);
  }
  return `<article class="ability ${active ? '' : 'passive'}"><div class="ability-top"><span class="ability-type">${type}</span><span class="ability-name">${esc(name || '이름 없음')}</span></div>${description ? `<p class="ability-description">${esc(description)}</p>` : ''}${items.length ? `<div class="ability-details">${items.join('')}</div>` : ''}</article>`;
}

function card(d, level) {
  const wiki = d.wiki || `https://phobies.fandom.com/wiki/${encodeURIComponent(String(d.name).replaceAll(' ','_'))}`;
  const baseAttack = d.damage;
  const additionalDamage = [
    numeric(d.splash) !== null ? `범위 ${valueAtLevel(d.splash, level)}` : '',
    numeric(d.electric) !== null ? `전기 ${valueAtLevel(d.electric, level)}` : '',
    numeric(d.poison) !== null ? `독 ${valueAtLevel(d.poison, level)}${d.duration ? ` × ${esc(d.duration)}` : ''}` : '',
    numeric(d.fire) !== null ? `화염 ${valueAtLevel(d.fire, level)}` : '',
    numeric(d.disease) !== null ? `질병 ${valueAtLevel(d.disease, level)}${d.duration ? ` × ${esc(d.duration)}` : ''}` : ''
  ].filter(Boolean).join(' · ');
  const abilities = [abilityCard(d, '액티브', level), abilityCard(d, '패시브', level)].filter(Boolean).join('');
  return `<article class="phobie-card">
    <header class="card-head"><div class="card-title"><h2 title="${esc(d.name)}">${esc(d.name)}</h2><div class="card-meta"><span class="pill key">${esc(d.keys)} KEY</span><span class="pill rarity-${rarityClass(d.rarity)}">${esc(d.rarity)}</span></div></div><a class="wiki-link" href="${esc(wiki)}" target="_blank" rel="noreferrer">WIKI ↗</a></header>
    <section class="stats" aria-label="기본 능력치">
      <div class="stat"><span class="stat-label">HP · Lv.${level}</span><strong class="stat-value health">${esc(valueAtLevel(d.health, level))}</strong></div>
      <div class="stat"><span class="stat-label">MOVE</span><strong class="stat-value">${esc(format(d.move_range))}</strong><small class="stat-sub">${esc(format(d.move_type))}</small></div>
      <div class="stat"><span class="stat-label">RANGE</span><strong class="stat-value">${esc(format(d.attack_range))}</strong><small class="stat-sub">${esc(format(d.attack_type))}</small></div>
      <div class="stat"><span class="stat-label">ATK · Lv.${level}</span><strong class="stat-value attack">${esc(valueAtLevel(baseAttack, level) || '—')}</strong><small class="stat-sub">${esc(format(d.damage_range))}</small></div>
    </section>
    ${additionalDamage ? `<div class="base-effects"><span class="detail-chip damage">추가 피해 · ${additionalDamage}</span></div>` : ''}
    ${abilities ? `<section class="ability-list" aria-label="특수 능력">${abilities}</section>` : `<p class="empty-ability">별도 특수 능력 없음</p>`}
  </article>`;
}

function render() {
  const level = Number(levelRange.value);
  $('levelValue').textContent = level;
  const query = search.value.trim().toLocaleLowerCase();
  let shown = data.filter(d => {
    const haystack = [d.name,d.rarity,d.move_type,d.attack_type,d.damage_range,d.passive_name,d.passive_description,d.active_name,d.active_description].join(' ').toLocaleLowerCase();
    return (!query || haystack.includes(query)) && (!rarity.value || String(d.rarity) === rarity.value) && (!keys.value || String(d.keys) === keys.value) && (!movement.value || String(d.move_type) === movement.value);
  });
  shown.sort((a,b) => sort.value === 'keys' ? Number(a.keys)-Number(b.keys) || a.name.localeCompare(b.name) : sort.value === 'health' ? Number(b.health)-Number(a.health) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  grid.innerHTML = shown.map(d => card(d, level)).join('');
  $('resultCount').textContent = `${shown.length} / ${data.length} CARDS`;
  $('emptyState').hidden = shown.length > 0;
}
[search, rarity, keys, movement, sort, levelRange].forEach(el => el.addEventListener(el === search || el === levelRange ? 'input' : 'change', render));
$('resetButton').addEventListener('click', () => { search.value=''; rarity.value=''; keys.value=''; movement.value=''; sort.value='name'; render(); search.focus(); });
render();
