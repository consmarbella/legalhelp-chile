import re, os

f_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'sitemap_raw.xml')
content = open(f_path, 'r', encoding='utf-8').read()
slugs = re.findall(r'<loc>https://legalhelp\.cl/p/([^<]+)', content)

cities = {
    'antofagasta','arica','calama','cerro-navia','chillan','colina','concepcion',
    'copiapo','coquimbo','curico','el-bosque','estacion-central','independencia',
    'iquique','la-florida','la-serena','lampa','las-condes','lo-barnechea',
    'los-angeles','maipu','nunoa','osorno','padre-las-casas','penalolen',
    'providencia','pudahuel','puente-alto','puerto-montt','punta-arenas',
    'quilicura','quilpue','quinta-normal','rancagua','recoleta','renca',
    'san-antonio','san-bernardo','san-miguel','santiago','santiago-centro',
    'talca','talcahuano','temuco','valdivia','valparaiso','vina-del-mar',
    'vitacura','los-andes','san-felipe','melipilla','talagante','buin',
    'isla-de-pascua','coyhaique'
}

cores = {}
for s in slugs:
    parts = s.split('-')
    core = s
    for i in range(len(parts), 0, -1):
        suffix = '-'.join(parts[i:])
        if suffix in cities:
            core = '-'.join(parts[:i])
            break
    cores[core] = s

for c in sorted(cores.keys()):
    print(c)
