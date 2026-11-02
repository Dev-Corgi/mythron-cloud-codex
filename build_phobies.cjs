const fs = require('node:fs/promises');
const { Workbook, SpreadsheetFile } = require('@oai/artifact-tool');
(async()=>{
const data = JSON.parse(await fs.readFile('phobies_data.json','utf8'));
const outDir = 'outputs/phobies-cards-2026-11-02';
const wb = Workbook.create();
const ph = wb.worksheets.add('Phobies');
const ab = wb.worksheets.add('능력 상세');
ph.showGridLines = false; ab.showGridLines = false;
ph.getRange('A1').values = [['출처 메모: 공개 Phobies 데이터베이스 v1.7(158종) 기반. 최신 위키 카드 일부는 원본에 없어 포함되지 않았으며, 카드별 위키 링크는 마지막 열에 있습니다. 원본: https://github.com/13ouncyKnight/Phobies_Game/blob/main/Official%20Phobies%20Database%281.7%20Bouncy%20Edit%29.xlsx']];
const phHeaders = ['이름','희귀도','소환 키 비용','체력','이동 거리','이동 유형','공격 유형','공격 사거리','피해 범위','기본 피해량','범위 피해량','전기 피해','독 피해','화염 피해','질병 피해','독 지속시간','카드 앞면 문구','카드 뒷면 문구','위키 문서'];
ph.getRange('A2:S2').values=[phHeaders];
ph.getRange(`A3:S${data.length+2}`).values=data.map(d=>[d.name,d.rarity,d.keys,d.health,d.move_range,d.move_type,d.attack_type,d.attack_range,d.damage_range,d.damage,d.splash,d.electric,d.poison,d.fire,d.disease,d.duration,d.front_phrase,d.back_phrase,d.wiki]);
const table1=ph.tables.add(`A2:S${data.length+2}`,true,'PhobiesTable'); table1.style='TableStyleMedium2';
ph.freezePanes.freezeRows(2);
ph.getRange('A1:S1').format.wrapText=false; ph.getRange('A1:S1').format.font={name:'Aptos',size:10,color:'#7F1D1D'}; ph.getRange('A1:S1').format.fill='#FEF2F2'; ph.getRange('A1:S1').format.rowHeight=26;
ph.getRange('A2:S2').format.wrapText=true; ph.getRange('A2:S2').format.rowHeight=34;
ph.getRange('A:S').format.verticalAlignment='center'; ph.getRange('A:A').format.columnWidth=22; ph.getRange('B:F').format.columnWidth=14; ph.getRange('G:I').format.columnWidth=22; ph.getRange('J:P').format.columnWidth=14; ph.getRange('Q:R').format.columnWidth=38; ph.getRange('S:S').format.columnWidth=40; ph.getRange(`Q3:R${data.length+2}`).format.wrapText=true;
ab.getRange('A1').values=[['능력 1개당 한 행입니다. 원본에 기재된 패시브·액티브 상세 수치와 설명을 옮겼습니다. 빈칸은 해당 능력에 값이 없거나 원본에 기재되지 않은 항목입니다.']];
const ah=['Phobie 이름','능력 유형','능력명','설명','발동 공격 유형','효과 범위','사거리','공격 피해','범위 피해','추가 이동','치유량','흡혈','부활 관련','장애물 효과','버프','디버프','함정 효과','전기 피해','독 피해','화염 피해','질병 피해','지속시간','효과 지속시간','재사용 대기시간','해금 조건','위키 문서'];
ab.getRange('A2:Z2').values=[ah];
const abilities=[];
for(const d of data){
 if(d.passive_name||d.passive_description) abilities.push([d.name,'패시브',d.passive_name,d.passive_description,d.attack_type,d.passive_effect_range,d.attack_range,d.passive_attack,'',d.passive_movement,d.passive_heal,d.passive_lifesteal,d.passive_resurrect,'',d.passive_buff,'','','', '', '',d.passive_disease,d.passive_duration,'','','',d.wiki]);
 if(d.active_name||d.active_description) abilities.push([d.name,'액티브',d.active_name,d.active_description,d.active_attack_type,d.effect_range,d.active_range,d.active_attack,d.active_splash,d.active_movement,d.active_heal,d.active_lifesteal,'',d.active_obstacle,d.active_buff,d.active_debuff,d.active_trap,d.active_electric,d.active_poison,d.active_fire,d.active_disease,d.active_duration,d.effect_duration,d.cooldown,d.unlocking,d.wiki]);
}
ab.getRange(`A3:Z${abilities.length+2}`).values=abilities;
const table2=ab.tables.add(`A2:Z${abilities.length+2}`,true,'AbilitiesTable'); table2.style='TableStyleMedium4'; ab.freezePanes.freezeRows(2);
ab.getRange('A1:Z1').format.wrapText=false; ab.getRange('A1:Z1').format.font={name:'Aptos',size:10,color:'#1E3A8A'}; ab.getRange('A1:Z1').format.fill='#EFF6FF'; ab.getRange('A1:Z1').format.rowHeight=26;
ab.getRange('A2:Z2').format.wrapText=true; ab.getRange('A2:Z2').format.rowHeight=40; ab.getRange('A:Z').format.verticalAlignment='center';
ab.getRange('A:A').format.columnWidth=22; ab.getRange('B:C').format.columnWidth=16; ab.getRange('D:D').format.columnWidth=58; ab.getRange('E:F').format.columnWidth=23; ab.getRange('G:Y').format.columnWidth=16; ab.getRange('Z:Z').format.columnWidth=40; ab.getRange(`D3:D${abilities.length+2}`).format.wrapText=true;
await fs.mkdir(outDir,{recursive:true}); await wb.recalculate();
const output=await SpreadsheetFile.exportXlsx(wb); const path=`${outDir}/Phobies_Cards.xlsx`; await output.save(path);
const p1=await wb.render({sheetName:'Phobies',range:'A1:S12',scale:1,format:'png'}); await fs.writeFile(`${outDir}/preview_phobies.png`,new Uint8Array(await p1.arrayBuffer()));
const p2=await wb.render({sheetName:'능력 상세',range:'A1:Z10',scale:1,format:'png'}); await fs.writeFile(`${outDir}/preview_abilities.png`,new Uint8Array(await p2.arrayBuffer()));
console.log(JSON.stringify({path,count:data.length,abilityRows:abilities.length}));
})().catch(e=>{console.error(e);process.exitCode=1});

