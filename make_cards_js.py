import json
p='PhobiesGallery/cards-data.json'
data=json.load(open(p,encoding='utf-8'))
with open('PhobiesGallery/cards.js','w',encoding='utf-8') as f:
 f.write('window.PHOBIES = ')
 json.dump(data,f,ensure_ascii=False,separators=(',',':'))
 f.write(';\n')
print('cards',len(data))
