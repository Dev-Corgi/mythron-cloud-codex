import json, openpyxl
s=openpyxl.load_workbook('phobies_source.xlsx',data_only=True)['Phobies']
def c(x):
 if x is None or (isinstance(x,str) and x.strip().upper() in {'N/A','NA','NO'}): return ''
 return x
rows=[]
for r in s.iter_rows(min_row=2,values_only=True):
 if not r[1]: continue
 rows.append({
 'name':c(r[1]),'rarity':c(r[3]),'keys':c(r[0]),'health':c(r[7]),'move_type':c(r[4]),'move_range':c(r[5]),
 'attack_type':c(r[15]),'attack_range':c(r[6]),'damage_range':c(r[16]),'damage':c(r[8]),'splash':c(r[9]),'electric':c(r[10]),'poison':c(r[11]),'fire':c(r[12]),'disease':c(r[13]),'duration':c(r[14]),'front_phrase':c(r[17]),'back_phrase':c(r[18]),
 'wiki':'https://phobies.fandom.com/wiki/'+str(r[1]).replace(' ','_'),
 'passive_name':c(r[20]),'passive_description':c(r[21]),'passive_effect_range':c(r[22]),'passive_movement':c(r[23]),'passive_heal':c(r[24]),'passive_lifesteal':c(r[25]),'passive_resurrect':c(r[26]),'passive_attack':c(r[27]),'passive_buff':c(r[28]),'passive_reflect':c(r[29]),'passive_electric':c(r[30]),'passive_disease':c(r[31]),'passive_duration':c(r[32]),
 'active_name':c(r[34]),'active_description':c(r[35]),'active_health':c(r[36]),'active_range':c(r[37]),'active_attack':c(r[38]),'active_splash':c(r[39]),'active_movement':c(r[40]),'active_heal':c(r[41]),'active_lifesteal':c(r[42]),'active_obstacle':c(r[43]),'active_buff':c(r[44]),'active_debuff':c(r[45]),'active_trap':c(r[46]),'active_electric':c(r[47]),'active_poison':c(r[48]),'active_fire':c(r[49]),'active_disease':c(r[50]),'active_duration':c(r[51]),'effect_duration':c(r[52]),'active_attack_type':c(r[53]),'effect_range':c(r[54]),'cooldown':c(r[55]),'unlocking':c(r[56])})
json.dump(rows,open('phobies_data.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
print('exported',len(rows),'sample',rows[0]['health'],rows[0]['damage'])
