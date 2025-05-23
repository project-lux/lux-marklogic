// Build properties are used when the value is used outside JS, such as in a JSON schema.
const IDENTIFIERS = {
  biographyStatement: 'http://vocab.getty.edu/aat/300435422',
  collection: 'http://vocab.getty.edu/aat/300025976',
  collectionItem: 'http://vocab.getty.edu/aat/300404024',
  department: 'http://vocab.getty.edu/aat/300263534',
  descriptionStatement: 'http://vocab.getty.edu/aat/300435416',
  exhibition: 'http://vocab.getty.edu/aat/300054766',
  female: 'http://vocab.getty.edu/aat/300189557',
  intersexual: 'http://vocab.getty.edu/aat/300417544',
  male: 'http://vocab.getty.edu/aat/300189559',
  myCollection: '%%identifierMyCollection%%',
  nationality: 'http://vocab.getty.edu/aat/300379842',
  occupation: 'http://vocab.getty.edu/aat/300263369',
  primaryName: 'http://vocab.getty.edu/aat/300404670',
  setNote: '%%identifierSetNote%%',
  setNoteLabel: '%%identifierSetNoteLabel%%',
  typeOfWork: 'http://vocab.getty.edu/aat/300435443',
  username: 'http://www.wikidata.org/entity/Q15901043',
  userProfile: '%%identifierUserProfile%%',

  langaa: 'http://vocab.getty.edu/aat/300387779',
  langaar: 'http://vocab.getty.edu/aat/300387779',
  langab: 'http://vocab.getty.edu/aat/300387766',
  langabk: 'http://vocab.getty.edu/aat/300387766',
  langabq: 'http://vocab.getty.edu/aat/300387765',
  langabr: 'http://vocab.getty.edu/aat/300387769',
  langabs: 'http://vocab.getty.edu/aat/300387819',
  langach: 'http://vocab.getty.edu/aat/300443615',
  langacr: 'http://vocab.getty.edu/aat/300387771',
  langacu: 'http://vocab.getty.edu/aat/300387773',
  langady: 'http://vocab.getty.edu/aat/300387776',
  langae: 'http://vocab.getty.edu/aat/300443616',
  langaf: 'http://vocab.getty.edu/aat/300387782',
  langafr: 'http://vocab.getty.edu/aat/300387782',
  langagu: 'http://vocab.getty.edu/aat/300387785',
  langagx: 'http://vocab.getty.edu/aat/300387784',
  langaht: 'http://vocab.getty.edu/aat/300387787',
  langain: 'http://vocab.getty.edu/aat/300387788',
  langak: 'http://vocab.getty.edu/aat/300387794',
  langaka: 'http://vocab.getty.edu/aat/300387794',
  langakk: 'http://vocab.getty.edu/aat/300393231',
  langalb: 'http://vocab.getty.edu/aat/300387803',
  langale: 'http://vocab.getty.edu/aat/300387806',
  langalg: 'http://vocab.getty.edu/aat/300387808',
  langam: 'http://vocab.getty.edu/aat/300387824',
  langamh: 'http://vocab.getty.edu/aat/300387824',
  langan: 'http://vocab.getty.edu/aat/300387855',
  langanu: 'http://vocab.getty.edu/aat/300387840',
  langaqc: 'http://vocab.getty.edu/aat/300387865',
  langar: 'http://vocab.getty.edu/aat/300387843',
  langara: 'http://vocab.getty.edu/aat/300387843',
  langarg: 'http://vocab.getty.edu/aat/300387855',
  langari: 'http://vocab.getty.edu/aat/300387867',
  langarm: 'http://vocab.getty.edu/aat/300387870',
  langary: 'http://vocab.getty.edu/aat/300387848',
  langarz: 'http://vocab.getty.edu/aat/300387846',
  langas: 'http://vocab.getty.edu/aat/300387879',
  langasm: 'http://vocab.getty.edu/aat/300387879',
  langast: 'http://vocab.getty.edu/aat/300387882',
  langath: 'http://vocab.getty.edu/aat/300387885',
  langav: 'http://vocab.getty.edu/aat/300387895',
  langava: 'http://vocab.getty.edu/aat/300387895',
  langave: 'http://vocab.getty.edu/aat/300443616',
  langaz: 'http://vocab.getty.edu/aat/300387903',
  langaze: 'http://vocab.getty.edu/aat/300387903',
  langba: 'http://vocab.getty.edu/aat/300443583',
  langbak: 'http://vocab.getty.edu/aat/300443583',
  langbal: 'http://vocab.getty.edu/aat/300387935',
  langbam: 'http://vocab.getty.edu/aat/300387937',
  langban: 'http://vocab.getty.edu/aat/300443617',
  langbaq: 'http://vocab.getty.edu/aat/300387955',
  langbar: 'http://vocab.getty.edu/aat/300387961',
  langbat: 'http://vocab.getty.edu/aat/300387934',
  langbde: 'http://vocab.getty.edu/aat/300387913',
  langbdk: 'http://vocab.getty.edu/aat/300388030',
  langbdq: 'http://vocab.getty.edu/aat/300443619',
  langbe: 'http://vocab.getty.edu/aat/300387967',
  langbej: 'http://vocab.getty.edu/aat/300443620',
  langbel: 'http://vocab.getty.edu/aat/300387967',
  langben: 'http://vocab.getty.edu/aat/300387971',
  langber: 'http://vocab.getty.edu/aat/300387974',
  langbg: 'http://vocab.getty.edu/aat/300388034',
  langbgc: 'http://vocab.getty.edu/aat/300388397',
  langbik: 'http://vocab.getty.edu/aat/300387990',
  langbjn: 'http://vocab.getty.edu/aat/300387942',
  langbkc: 'http://vocab.getty.edu/aat/300387926',
  langbla: 'http://vocab.getty.edu/aat/300388004',
  langbll: 'http://vocab.getty.edu/aat/300387991',
  langbm: 'http://vocab.getty.edu/aat/300387937',
  langbn: 'http://vocab.getty.edu/aat/300387971',
  langbnt: 'http://vocab.getty.edu/aat/300387944',
  langbol: 'http://vocab.getty.edu/aat/300388012',
  langbos: 'http://vocab.getty.edu/aat/300388023',
  langbr: 'http://vocab.getty.edu/aat/300388464',
  langbre: 'http://vocab.getty.edu/aat/300388464',
  langbrh: 'http://vocab.getty.edu/aat/300443622',
  langbrx: 'http://vocab.getty.edu/aat/300388007',
  langbs: 'http://vocab.getty.edu/aat/300388023',
  langbsk: 'http://vocab.getty.edu/aat/300443624',
  langbua: 'http://vocab.getty.edu/aat/300388041',
  langbul: 'http://vocab.getty.edu/aat/300388034',
  langbvb: 'http://vocab.getty.edu/aat/300388029',
  langca: 'http://vocab.getty.edu/aat/300388072',
  langcal: 'http://vocab.getty.edu/aat/300388067',
  langcat: 'http://vocab.getty.edu/aat/300388072',
  langcay: 'http://vocab.getty.edu/aat/300388075',
  langcbs: 'http://vocab.getty.edu/aat/300388070',
  langceb: 'http://vocab.getty.edu/aat/300388076',
  langcel: 'http://vocab.getty.edu/aat/300389733',
  langces: 'http://vocab.getty.edu/aat/300388191',
  langch: 'http://vocab.getty.edu/aat/300388087',
  langcha: 'http://vocab.getty.edu/aat/300388087',
  langchg: 'http://vocab.getty.edu/aat/300388081',
  langchi: 'http://vocab.getty.edu/aat/300388113',
  langcho: 'http://vocab.getty.edu/aat/300388144',
  langchr: 'http://vocab.getty.edu/aat/300388097',
  langchu: 'http://vocab.getty.edu/aat/300389289',
  langchy: 'http://vocab.getty.edu/aat/300388100',
  langcic: 'http://vocab.getty.edu/aat/300388107',
  langcim: 'http://vocab.getty.edu/aat/300388164',
  langclw: 'http://vocab.getty.edu/aat/300388158',
  langcmn: 'http://vocab.getty.edu/aat/300388127',
  langco: 'http://vocab.getty.edu/aat/300443631',
  langcop: 'http://vocab.getty.edu/aat/300443630',
  langcor: 'http://vocab.getty.edu/aat/300388179',
  langcos: 'http://vocab.getty.edu/aat/300443631',
  langcr: 'http://vocab.getty.edu/aat/300388182',
  langcre: 'http://vocab.getty.edu/aat/300388182',
  langcrs: 'http://vocab.getty.edu/aat/300389251',
  langcs: 'http://vocab.getty.edu/aat/300388191',
  langcsb: 'http://vocab.getty.edu/aat/300388559',
  langcu: 'http://vocab.getty.edu/aat/300389289',
  langcy: 'http://vocab.getty.edu/aat/300389555',
  langda: 'http://vocab.getty.edu/aat/300388204',
  langdan: 'http://vocab.getty.edu/aat/300388204',
  langdar: 'http://vocab.getty.edu/aat/300388207',
  langde: 'http://vocab.getty.edu/aat/300388344',
  langdeu: 'http://vocab.getty.edu/aat/300388344',
  langdin: 'http://vocab.getty.edu/aat/300388229',
  langdiu: 'http://vocab.getty.edu/aat/300388233',
  langdlm: 'http://vocab.getty.edu/aat/300388199',
  langdsb: 'http://vocab.getty.edu/aat/300443634',
  langdua: 'http://vocab.getty.edu/aat/300443635',
  langdum: 'http://vocab.getty.edu/aat/300388305',
  langdut: 'http://vocab.getty.edu/aat/300388256',
  langdz: 'http://vocab.getty.edu/aat/300391398',
  langdzo: 'http://vocab.getty.edu/aat/300391398',
  langegy: 'http://vocab.getty.edu/aat/300388267',
  langel: 'http://vocab.getty.edu/aat/300388361',
  langen: 'http://vocab.getty.edu/aat/300388277',
  langenb: 'http://vocab.getty.edu/aat/300388829',
  langeng: 'http://vocab.getty.edu/aat/300388277',
  langenm: 'http://vocab.getty.edu/aat/300388869',
  langeo: 'http://vocab.getty.edu/aat/300388282',
  langepo: 'http://vocab.getty.edu/aat/300388282',
  langes: 'http://vocab.getty.edu/aat/300389311',
  langest: 'http://vocab.getty.edu/aat/300388283',
  langet: 'http://vocab.getty.edu/aat/300388283',
  langeto: 'http://vocab.getty.edu/aat/300388285',
  langett: 'http://vocab.getty.edu/aat/300388286',
  langeu: 'http://vocab.getty.edu/aat/300387955',
  langevn: 'http://vocab.getty.edu/aat/300443637',
  langfa: 'http://vocab.getty.edu/aat/300389087',
  langfan: 'http://vocab.getty.edu/aat/300388292',
  langfao: 'http://vocab.getty.edu/aat/300388293',
  langff: 'http://vocab.getty.edu/aat/300388313',
  langfi: 'http://vocab.getty.edu/aat/300388299',
  langfij: 'http://vocab.getty.edu/aat/300388298',
  langfin: 'http://vocab.getty.edu/aat/300388299',
  langfiu: 'http://vocab.getty.edu/aat/300388300',
  langfj: 'http://vocab.getty.edu/aat/300388298',
  langfo: 'http://vocab.getty.edu/aat/300388293',
  langfon: 'http://vocab.getty.edu/aat/300388302',
  langfr: 'http://vocab.getty.edu/aat/300388306',
  langfrc: 'http://vocab.getty.edu/aat/300388056',
  langfre: 'http://vocab.getty.edu/aat/300388306',
  langfrk: 'http://vocab.getty.edu/aat/300388305',
  langfro: 'http://vocab.getty.edu/aat/300455833',
  langfrr: 'http://vocab.getty.edu/aat/300443826',
  langful: 'http://vocab.getty.edu/aat/300388313',
  langfur: 'http://vocab.getty.edu/aat/300388309',
  langga: 'http://vocab.getty.edu/aat/300388467',
  langgab: 'http://vocab.getty.edu/aat/300388318',
  langgd: 'http://vocab.getty.edu/aat/300389223',
  langgdo: 'http://vocab.getty.edu/aat/300388350',
  langgeo: 'http://vocab.getty.edu/aat/300388343',
  langgez: 'http://vocab.getty.edu/aat/300388341',
  langgft: 'http://vocab.getty.edu/aat/300388325',
  langgid: 'http://vocab.getty.edu/aat/300388353',
  langgin: 'http://vocab.getty.edu/aat/300388415',
  langgl: 'http://vocab.getty.edu/aat/300388327',
  langgla: 'http://vocab.getty.edu/aat/300389223',
  langgle: 'http://vocab.getty.edu/aat/300388467',
  langglg: 'http://vocab.getty.edu/aat/300388327',
  langglk: 'http://vocab.getty.edu/aat/300443649',
  langgn: 'http://vocab.getty.edu/aat/300388369',
  langgnc: 'http://vocab.getty.edu/aat/300388367',
  langgoh: 'http://vocab.getty.edu/aat/300411851',
  langgot: 'http://vocab.getty.edu/aat/300395498',
  langgrc: 'http://vocab.getty.edu/aat/300389734',
  langgre: 'http://vocab.getty.edu/aat/300388361',
  langgrn: 'http://vocab.getty.edu/aat/300388369',
  langgu: 'http://vocab.getty.edu/aat/300388372',
  langguj: 'http://vocab.getty.edu/aat/300388372',
  langha: 'http://vocab.getty.edu/aat/300388399',
  langhak: 'http://vocab.getty.edu/aat/300388124',
  langhat: 'http://vocab.getty.edu/aat/300388389',
  langhau: 'http://vocab.getty.edu/aat/300388399',
  langhaw: 'http://vocab.getty.edu/aat/300388400',
  langhbo: 'http://vocab.getty.edu/aat/300393151',
  langhbs: 'http://vocab.getty.edu/aat/300389248',
  langhe: 'http://vocab.getty.edu/aat/300388401',
  langheb: 'http://vocab.getty.edu/aat/300388401',
  langher: 'http://vocab.getty.edu/aat/300388407',
  langhi: 'http://vocab.getty.edu/aat/300388412',
  langhia: 'http://vocab.getty.edu/aat/300388680',
  langhin: 'http://vocab.getty.edu/aat/300388412',
  langhit: 'http://vocab.getty.edu/aat/300388416',
  langhmo: 'http://vocab.getty.edu/aat/300391423',
  langho: 'http://vocab.getty.edu/aat/300391423',
  langhr: 'http://vocab.getty.edu/aat/300388185',
  langhrv: 'http://vocab.getty.edu/aat/300388185',
  langhsb: 'http://vocab.getty.edu/aat/300443659',
  langht: 'http://vocab.getty.edu/aat/300388389',
  langhu: 'http://vocab.getty.edu/aat/300388770',
  langhun: 'http://vocab.getty.edu/aat/300388770',
  langhur: 'http://vocab.getty.edu/aat/300388394',
  langhus: 'http://vocab.getty.edu/aat/300438716',
  langhy: 'http://vocab.getty.edu/aat/300387870',
  langhz: 'http://vocab.getty.edu/aat/300388407',
  langibo: 'http://vocab.getty.edu/aat/300388453',
  langice: 'http://vocab.getty.edu/aat/300388449',
  langid: 'http://vocab.getty.edu/aat/300388460',
  langig: 'http://vocab.getty.edu/aat/300388453',
  langijo: 'http://vocab.getty.edu/aat/300388454',
  langiku: 'http://vocab.getty.edu/aat/300443664',
  langilo: 'http://vocab.getty.edu/aat/300388456',
  langinc: 'http://vocab.getty.edu/aat/300388457',
  langind: 'http://vocab.getty.edu/aat/300388460',
  langinh: 'http://vocab.getty.edu/aat/300388463',
  langiow: 'http://vocab.getty.edu/aat/300388466',
  langis: 'http://vocab.getty.edu/aat/300388449',
  langit: 'http://vocab.getty.edu/aat/300388474',
  langita: 'http://vocab.getty.edu/aat/300388474',
  langitk: 'http://vocab.getty.edu/aat/300388510',
  langitl: 'http://vocab.getty.edu/aat/300388476',
  langiu: 'http://vocab.getty.edu/aat/300443664',
  langizh: 'http://vocab.getty.edu/aat/300388462',
  langja: 'http://vocab.getty.edu/aat/300388486',
  langjac: 'http://vocab.getty.edu/aat/300388481',
  langjav: 'http://vocab.getty.edu/aat/300388490',
  langjbn: 'http://vocab.getty.edu/aat/300443667',
  langjct: 'http://vocab.getty.edu/aat/300389382',
  langjdt: 'http://vocab.getty.edu/aat/300388507',
  langjim: 'http://vocab.getty.edu/aat/300388500',
  langjpn: 'http://vocab.getty.edu/aat/300388486',
  langjv: 'http://vocab.getty.edu/aat/300388490',
  langka: 'http://vocab.getty.edu/aat/300388343',
  langkab: 'http://vocab.getty.edu/aat/300443669',
  langkal: 'http://vocab.getty.edu/aat/300388363',
  langkam: 'http://vocab.getty.edu/aat/300443670',
  langkan: 'http://vocab.getty.edu/aat/300388538',
  langkas: 'http://vocab.getty.edu/aat/300388558',
  langkau: 'http://vocab.getty.edu/aat/300388542',
  langkaz: 'http://vocab.getty.edu/aat/300391413',
  langkbd: 'http://vocab.getty.edu/aat/300388516',
  langkbp: 'http://vocab.getty.edu/aat/300443671',
  langkde: 'http://vocab.getty.edu/aat/300388781',
  langkek: 'http://vocab.getty.edu/aat/300388571',
  langkg: 'http://vocab.getty.edu/aat/300388623',
  langkhk: 'http://vocab.getty.edu/aat/300388581',
  langkhm: 'http://vocab.getty.edu/aat/300388591',
  langki: 'http://vocab.getty.edu/aat/300443672',
  langkik: 'http://vocab.getty.edu/aat/300443672',
  langkj: 'http://vocab.getty.edu/aat/300451689',
  langkjj: 'http://vocab.getty.edu/aat/300388589',
  langkk: 'http://vocab.getty.edu/aat/300391413',
  langkl: 'http://vocab.getty.edu/aat/300388363',
  langkm: 'http://vocab.getty.edu/aat/300388591',
  langkn: 'http://vocab.getty.edu/aat/300388538',
  langko: 'http://vocab.getty.edu/aat/300388633',
  langkok: 'http://vocab.getty.edu/aat/300388627',
  langkon: 'http://vocab.getty.edu/aat/300388623',
  langkor: 'http://vocab.getty.edu/aat/300388633',
  langkr: 'http://vocab.getty.edu/aat/300388542',
  langkrl: 'http://vocab.getty.edu/aat/300388551',
  langkrs: 'http://vocab.getty.edu/aat/300388646',
  langks: 'http://vocab.getty.edu/aat/300388558',
  langktb: 'http://vocab.getty.edu/aat/300443679',
  langku: 'http://vocab.getty.edu/aat/300388656',
  langkua: 'http://vocab.getty.edu/aat/300451689',
  langkur: 'http://vocab.getty.edu/aat/300388656',
  langkw: 'http://vocab.getty.edu/aat/300388179',
  langkyf: 'http://vocab.getty.edu/aat/300388641',
  langla: 'http://vocab.getty.edu/aat/300388693',
  langlac: 'http://vocab.getty.edu/aat/300388671',
  langlad: 'http://vocab.getty.edu/aat/300388672',
  langlah: 'http://vocab.getty.edu/aat/300443681',
  langlam: 'http://vocab.getty.edu/aat/300443682',
  langlao: 'http://vocab.getty.edu/aat/300388688',
  langlat: 'http://vocab.getty.edu/aat/300388693',
  langlav: 'http://vocab.getty.edu/aat/300388696',
  langlb: 'http://vocab.getty.edu/aat/300443689',
  langlbq: 'http://vocab.getty.edu/aat/300389544',
  langlez: 'http://vocab.getty.edu/aat/300388711',
  langlgq: 'http://vocab.getty.edu/aat/300388726',
  langlin: 'http://vocab.getty.edu/aat/300388719',
  langlit: 'http://vocab.getty.edu/aat/300388723',
  langliv: 'http://vocab.getty.edu/aat/300391521',
  langlmo: 'http://vocab.getty.edu/aat/300388730',
  langln: 'http://vocab.getty.edu/aat/300388719',
  langlnc: 'http://vocab.getty.edu/aat/300388687',
  langlng: 'http://vocab.getty.edu/aat/300388730',
  langlo: 'http://vocab.getty.edu/aat/300388688',
  langlol: 'http://vocab.getty.edu/aat/300443687',
  langlot: 'http://vocab.getty.edu/aat/300389040',
  langloz: 'http://vocab.getty.edu/aat/300388738',
  langlt: 'http://vocab.getty.edu/aat/300388723',
  langltz: 'http://vocab.getty.edu/aat/300443689',
  langlu: 'http://vocab.getty.edu/aat/300443690',
  langlua: 'http://vocab.getty.edu/aat/300389449',
  langlub: 'http://vocab.getty.edu/aat/300443690',
  langluo: 'http://vocab.getty.edu/aat/300443691',
  langlus: 'http://vocab.getty.edu/aat/300388887',
  langluy: 'http://vocab.getty.edu/aat/300388754',
  langlv: 'http://vocab.getty.edu/aat/300388696',
  langmag: 'http://vocab.getty.edu/aat/300388768',
  langmai: 'http://vocab.getty.edu/aat/300388776',
  langmal: 'http://vocab.getty.edu/aat/300388787',
  langmam: 'http://vocab.getty.edu/aat/300389343',
  langmao: 'http://vocab.getty.edu/aat/300388818',
  langmap: 'http://vocab.getty.edu/aat/300411921',
  langmar: 'http://vocab.getty.edu/aat/300388822',
  langmas: 'http://vocab.getty.edu/aat/300388758',
  langmcn: 'http://vocab.getty.edu/aat/300388833',
  langmdh: 'http://vocab.getty.edu/aat/300443693',
  langmeq: 'http://vocab.getty.edu/aat/300388863',
  langmez: 'http://vocab.getty.edu/aat/300388861',
  langmg: 'http://vocab.getty.edu/aat/300388783',
  langmi: 'http://vocab.getty.edu/aat/300388818',
  langmic: 'http://vocab.getty.edu/aat/300388867',
  langmin: 'http://vocab.getty.edu/aat/300443696',
  langmk: 'http://vocab.getty.edu/aat/300388760',
  langmkd: 'http://vocab.getty.edu/aat/300388760',
  langmkh: 'http://vocab.getty.edu/aat/300388899',
  langml: 'http://vocab.getty.edu/aat/300388787',
  langmlg: 'http://vocab.getty.edu/aat/300388783',
  langmlt: 'http://vocab.getty.edu/aat/300388796',
  langmn: 'http://vocab.getty.edu/aat/300388900',
  langmnc: 'http://vocab.getty.edu/aat/300388801',
  langmo: 'http://vocab.getty.edu/aat/300393755',
  langmoh: 'http://vocab.getty.edu/aat/300388892',
  langmol: 'http://vocab.getty.edu/aat/300393755',
  langmon: 'http://vocab.getty.edu/aat/300388900',
  langmoz: 'http://vocab.getty.edu/aat/300388896',
  langmr: 'http://vocab.getty.edu/aat/300388822',
  langmrh: 'http://vocab.getty.edu/aat/300388675',
  langmrv: 'http://vocab.getty.edu/aat/300388808',
  langms: 'http://vocab.getty.edu/aat/300388786',
  langmsa: 'http://vocab.getty.edu/aat/300388786',
  langmt: 'http://vocab.getty.edu/aat/300388796',
  langmug: 'http://vocab.getty.edu/aat/300388922',
  langmun: 'http://vocab.getty.edu/aat/300395444',
  langmwl: 'http://vocab.getty.edu/aat/300388881',
  langmwr: 'http://vocab.getty.edu/aat/300388832',
  langmy: 'http://vocab.getty.edu/aat/300388042',
  langmya: 'http://vocab.getty.edu/aat/300388042',
  langmzb: 'http://vocab.getty.edu/aat/300388928',
  langna: 'http://vocab.getty.edu/aat/300388951',
  langnah: 'http://vocab.getty.edu/aat/300388932',
  langnai: 'http://vocab.getty.edu/aat/300388991',
  langnap: 'http://vocab.getty.edu/aat/300388942',
  langnau: 'http://vocab.getty.edu/aat/300388951',
  langnav: 'http://vocab.getty.edu/aat/300388952',
  langnb: 'http://vocab.getty.edu/aat/300391418',
  langnbl: 'http://vocab.getty.edu/aat/300388955',
  langnci: 'http://vocab.getty.edu/aat/300387906',
  langnd: 'http://vocab.getty.edu/aat/300443703',
  langnde: 'http://vocab.getty.edu/aat/300443703',
  langndo: 'http://vocab.getty.edu/aat/300388958',
  langnds: 'http://vocab.getty.edu/aat/300388737',
  langne: 'http://vocab.getty.edu/aat/300443704',
  langnep: 'http://vocab.getty.edu/aat/300443704',
  langng: 'http://vocab.getty.edu/aat/300388958',
  langngi: 'http://vocab.getty.edu/aat/300388972',
  langnl: 'http://vocab.getty.edu/aat/300388256',
  langnn: 'http://vocab.getty.edu/aat/300388992',
  langnnc: 'http://vocab.getty.edu/aat/300388938',
  langnnh: 'http://vocab.getty.edu/aat/300388970',
  langnno: 'http://vocab.getty.edu/aat/300388992',
  langno: 'http://vocab.getty.edu/aat/300443706',
  langnob: 'http://vocab.getty.edu/aat/300391418',
  langnon: 'http://vocab.getty.edu/aat/300389021',
  langnor: 'http://vocab.getty.edu/aat/300443706',
  langnr: 'http://vocab.getty.edu/aat/300388955',
  langnuk: 'http://vocab.getty.edu/aat/300388988',
  langnus: 'http://vocab.getty.edu/aat/300388997',
  langnv: 'http://vocab.getty.edu/aat/300388952',
  langoc: 'http://vocab.getty.edu/aat/300391532',
  langoci: 'http://vocab.getty.edu/aat/300391532',
  langoj: 'http://vocab.getty.edu/aat/300389015',
  langoji: 'http://vocab.getty.edu/aat/300389015',
  langoka: 'http://vocab.getty.edu/aat/300389016',
  langoki: 'http://vocab.getty.edu/aat/300389017',
  langom: 'http://vocab.getty.edu/aat/300389033',
  langoma: 'http://vocab.getty.edu/aat/300389023',
  langone: 'http://vocab.getty.edu/aat/300389025',
  langono: 'http://vocab.getty.edu/aat/300389027',
  langor: 'http://vocab.getty.edu/aat/300389030',
  langori: 'http://vocab.getty.edu/aat/300389030',
  langorm: 'http://vocab.getty.edu/aat/300389033',
  langoru: 'http://vocab.getty.edu/aat/300389031',
  langosx: 'http://vocab.getty.edu/aat/300389220',
  langota: 'http://vocab.getty.edu/aat/300451714',
  langpal: 'http://vocab.getty.edu/aat/300389085',
  langpan: 'http://vocab.getty.edu/aat/300389057',
  langpap: 'http://vocab.getty.edu/aat/300443715',
  langpaw: 'http://vocab.getty.edu/aat/300389078',
  langpbi: 'http://vocab.getty.edu/aat/300389104',
  langpei: 'http://vocab.getty.edu/aat/300388106',
  langpeo: 'http://vocab.getty.edu/aat/300389086',
  langper: 'http://vocab.getty.edu/aat/300389087',
  langpes: 'http://vocab.getty.edu/aat/300388296',
  langphn: 'http://vocab.getty.edu/aat/300389090',
  langpi: 'http://vocab.getty.edu/aat/300404714',
  langpko: 'http://vocab.getty.edu/aat/300389107',
  langpl: 'http://vocab.getty.edu/aat/300389109',
  langpli: 'http://vocab.getty.edu/aat/300404714',
  langpmt: 'http://vocab.getty.edu/aat/300389456',
  langpno: 'http://vocab.getty.edu/aat/300389061',
  langpol: 'http://vocab.getty.edu/aat/300389109',
  langpor: 'http://vocab.getty.edu/aat/300389115',
  langpox: 'http://vocab.getty.edu/aat/300389108',
  langps: 'http://vocab.getty.edu/aat/300389124',
  langpt: 'http://vocab.getty.edu/aat/300389115',
  langpus: 'http://vocab.getty.edu/aat/300389124',
  langqu: 'http://vocab.getty.edu/aat/300443719',
  langquc: 'http://vocab.getty.edu/aat/300389129',
  langque: 'http://vocab.getty.edu/aat/300443719',
  langqum: 'http://vocab.getty.edu/aat/300389283',
  langraj: 'http://vocab.getty.edu/aat/300389133',
  langrar: 'http://vocab.getty.edu/aat/300389138',
  langrel: 'http://vocab.getty.edu/aat/300389142',
  langrif: 'http://vocab.getty.edu/aat/300389378',
  langrm: 'http://vocab.getty.edu/aat/300389162',
  langrn: 'http://vocab.getty.edu/aat/300389166',
  langrng: 'http://vocab.getty.edu/aat/300389163',
  langro: 'http://vocab.getty.edu/aat/300389157',
  langroa: 'http://vocab.getty.edu/aat/300389149',
  langroh: 'http://vocab.getty.edu/aat/300389162',
  langrom: 'http://vocab.getty.edu/aat/300389150',
  langru: 'http://vocab.getty.edu/aat/300389169',
  langrue: 'http://vocab.getty.edu/aat/300443723',
  langrum: 'http://vocab.getty.edu/aat/300389157',
  langrun: 'http://vocab.getty.edu/aat/300389166',
  langruo: 'http://vocab.getty.edu/aat/300388472',
  langrup: 'http://vocab.getty.edu/aat/300389158',
  langrus: 'http://vocab.getty.edu/aat/300389169',
  langsa: 'http://vocab.getty.edu/aat/300389206',
  langsad: 'http://vocab.getty.edu/aat/300389201',
  langsag: 'http://vocab.getty.edu/aat/300389203',
  langsah: 'http://vocab.getty.edu/aat/300443724',
  langsai: 'http://vocab.getty.edu/aat/300389309',
  langsam: 'http://vocab.getty.edu/aat/300387858',
  langsan: 'http://vocab.getty.edu/aat/300389206',
  langsat: 'http://vocab.getty.edu/aat/300389207',
  langsaz: 'http://vocab.getty.edu/aat/300389216',
  langscn: 'http://vocab.getty.edu/aat/300389271',
  langsco: 'http://vocab.getty.edu/aat/300389222',
  langsd: 'http://vocab.getty.edu/aat/300389278',
  langse: 'http://vocab.getty.edu/aat/300443601',
  langsee: 'http://vocab.getty.edu/aat/300389239',
  langseh: 'http://vocab.getty.edu/aat/300389237',
  langsem: 'http://vocab.getty.edu/aat/300389236',
  langsg: 'http://vocab.getty.edu/aat/300389203',
  langsh: 'http://vocab.getty.edu/aat/300389248',
  langshi: 'http://vocab.getty.edu/aat/300443726',
  langshk: 'http://vocab.getty.edu/aat/300389261',
  langshn: 'http://vocab.getty.edu/aat/300443727',
  langshr: 'http://vocab.getty.edu/aat/300389260',
  langsi: 'http://vocab.getty.edu/aat/300389279',
  langsid: 'http://vocab.getty.edu/aat/300443728',
  langsin: 'http://vocab.getty.edu/aat/300389279',
  langsiz: 'http://vocab.getty.edu/aat/300389285',
  langsk: 'http://vocab.getty.edu/aat/300389290',
  langskr: 'http://vocab.getty.edu/aat/300389212',
  langsl: 'http://vocab.getty.edu/aat/300389291',
  langslk: 'http://vocab.getty.edu/aat/300389290',
  langslv: 'http://vocab.getty.edu/aat/300389291',
  langsm: 'http://vocab.getty.edu/aat/300389198',
  langsma: 'http://vocab.getty.edu/aat/300443730',
  langsme: 'http://vocab.getty.edu/aat/300443601',
  langsmi: 'http://vocab.getty.edu/aat/300389176',
  langsmj: 'http://vocab.getty.edu/aat/300443732',
  langsmo: 'http://vocab.getty.edu/aat/300389198',
  langsmp: 'http://vocab.getty.edu/aat/300389196',
  langsms: 'http://vocab.getty.edu/aat/300443734',
  langsn: 'http://vocab.getty.edu/aat/300443735',
  langsna: 'http://vocab.getty.edu/aat/300443735',
  langsnd: 'http://vocab.getty.edu/aat/300389278',
  langsnk: 'http://vocab.getty.edu/aat/300389302',
  langso: 'http://vocab.getty.edu/aat/300389295',
  langsom: 'http://vocab.getty.edu/aat/300389295',
  langsot: 'http://vocab.getty.edu/aat/300443737',
  langspa: 'http://vocab.getty.edu/aat/300389311',
  langsq: 'http://vocab.getty.edu/aat/300387803',
  langsqt: 'http://vocab.getty.edu/aat/300443738',
  langsr: 'http://vocab.getty.edu/aat/300389247',
  langsrn: 'http://vocab.getty.edu/aat/300389316',
  langsrp: 'http://vocab.getty.edu/aat/300389247',
  langsrr: 'http://vocab.getty.edu/aat/300443739',
  langss: 'http://vocab.getty.edu/aat/300389335',
  langssw: 'http://vocab.getty.edu/aat/300389335',
  langst: 'http://vocab.getty.edu/aat/300443737',
  langsu: 'http://vocab.getty.edu/aat/300389326',
  langsun: 'http://vocab.getty.edu/aat/300389326',
  langsux: 'http://vocab.getty.edu/aat/300443740',
  langsv: 'http://vocab.getty.edu/aat/300389336',
  langswe: 'http://vocab.getty.edu/aat/300389336',
  langswg: 'http://vocab.getty.edu/aat/300389333',
  langsxm: 'http://vocab.getty.edu/aat/300389200',
  langsyc: 'http://vocab.getty.edu/aat/300389337',
  langta: 'http://vocab.getty.edu/aat/300389365',
  langtab: 'http://vocab.getty.edu/aat/300389341',
  langtah: 'http://vocab.getty.edu/aat/300389346',
  langtai: 'http://vocab.getty.edu/aat/300411954',
  langtam: 'http://vocab.getty.edu/aat/300389365',
  langtan: 'http://vocab.getty.edu/aat/300389370',
  langtat: 'http://vocab.getty.edu/aat/300389381',
  langtcy: 'http://vocab.getty.edu/aat/300389461',
  langte: 'http://vocab.getty.edu/aat/300389389',
  langtel: 'http://vocab.getty.edu/aat/300389389',
  langtem: 'http://vocab.getty.edu/aat/300389392',
  langteo: 'http://vocab.getty.edu/aat/300389402',
  langtet: 'http://vocab.getty.edu/aat/300389403',
  langtg: 'http://vocab.getty.edu/aat/300389350',
  langtgg: 'http://vocab.getty.edu/aat/300389371',
  langtgk: 'http://vocab.getty.edu/aat/300389350',
  langtgl: 'http://vocab.getty.edu/aat/300389344',
  langth: 'http://vocab.getty.edu/aat/300389405',
  langtha: 'http://vocab.getty.edu/aat/300389405',
  langti: 'http://vocab.getty.edu/aat/300389414',
  langtir: 'http://vocab.getty.edu/aat/300389414',
  langtiv: 'http://vocab.getty.edu/aat/300443744',
  langtk: 'http://vocab.getty.edu/aat/300389473',
  langtkr: 'http://vocab.getty.edu/aat/300389445',
  langtl: 'http://vocab.getty.edu/aat/300389344',
  langtn: 'http://vocab.getty.edu/aat/300389252',
  langto: 'http://vocab.getty.edu/aat/300389432',
  langton: 'http://vocab.getty.edu/aat/300389432',
  langtpi: 'http://vocab.getty.edu/aat/300389425',
  langtqq: 'http://vocab.getty.edu/aat/300389465',
  langtr: 'http://vocab.getty.edu/aat/300389470',
  langtrp: 'http://vocab.getty.edu/aat/300388615',
  langts: 'http://vocab.getty.edu/aat/300389452',
  langtsb: 'http://vocab.getty.edu/aat/300389447',
  langtsn: 'http://vocab.getty.edu/aat/300389252',
  langtso: 'http://vocab.getty.edu/aat/300389452',
  langtt: 'http://vocab.getty.edu/aat/300389381',
  langtuk: 'http://vocab.getty.edu/aat/300389473',
  langtum: 'http://vocab.getty.edu/aat/300389462',
  langtur: 'http://vocab.getty.edu/aat/300389470',
  langtus: 'http://vocab.getty.edu/aat/300389475',
  langtuv: 'http://vocab.getty.edu/aat/300389467',
  langty: 'http://vocab.getty.edu/aat/300389346',
  langtzj: 'http://vocab.getty.edu/aat/300389484',
  langudi: 'http://vocab.getty.edu/aat/300389486',
  langug: 'http://vocab.getty.edu/aat/300389509',
  languig: 'http://vocab.getty.edu/aat/300389509',
  languk: 'http://vocab.getty.edu/aat/300389489',
  langukr: 'http://vocab.getty.edu/aat/300389489',
  langumb: 'http://vocab.getty.edu/aat/300443754',
  langur: 'http://vocab.getty.edu/aat/300389502',
  langurd: 'http://vocab.getty.edu/aat/300389502',
  langusp: 'http://vocab.getty.edu/aat/300389505',
  languz: 'http://vocab.getty.edu/aat/300389510',
  languzb: 'http://vocab.getty.edu/aat/300389510',
  langvai: 'http://vocab.getty.edu/aat/300443755',
  langve: 'http://vocab.getty.edu/aat/300389522',
  langvec: 'http://vocab.getty.edu/aat/300395469',
  langven: 'http://vocab.getty.edu/aat/300389522',
  langvi: 'http://vocab.getty.edu/aat/300389525',
  langvie: 'http://vocab.getty.edu/aat/300389525',
  langvmw: 'http://vocab.getty.edu/aat/300443756',
  langvo: 'http://vocab.getty.edu/aat/300443757',
  langvol: 'http://vocab.getty.edu/aat/300443757',
  langwa: 'http://vocab.getty.edu/aat/300389541',
  langwae: 'http://vocab.getty.edu/aat/300389542',
  langwam: 'http://vocab.getty.edu/aat/300389543',
  langwao: 'http://vocab.getty.edu/aat/300389548',
  langwel: 'http://vocab.getty.edu/aat/300389555',
  langwen: 'http://vocab.getty.edu/aat/300389306',
  langwic: 'http://vocab.getty.edu/aat/300389561',
  langwit: 'http://vocab.getty.edu/aat/300389564',
  langwln: 'http://vocab.getty.edu/aat/300389541',
  langwls: 'http://vocab.getty.edu/aat/300389540',
  langwo: 'http://vocab.getty.edu/aat/300389568',
  langwol: 'http://vocab.getty.edu/aat/300389568',
  langwya: 'http://vocab.getty.edu/aat/300389574',
  langxce: 'http://vocab.getty.edu/aat/300393149',
  langxgf: 'http://vocab.getty.edu/aat/300388319',
  langxh: 'http://vocab.getty.edu/aat/300389577',
  langxho: 'http://vocab.getty.edu/aat/300389577',
  langxil: 'http://vocab.getty.edu/aat/300387830',
  langxmf: 'http://vocab.getty.edu/aat/300388877',
  langxmk: 'http://vocab.getty.edu/aat/300391467',
  langxnt: 'http://vocab.getty.edu/aat/300388945',
  langxpq: 'http://vocab.getty.edu/aat/300388893',
  langxve: 'http://vocab.getty.edu/aat/300395469',
  langyao: 'http://vocab.getty.edu/aat/300389592',
  langyi: 'http://vocab.getty.edu/aat/300389602',
  langyid: 'http://vocab.getty.edu/aat/300389602',
  langymm: 'http://vocab.getty.edu/aat/300388759',
  langyo: 'http://vocab.getty.edu/aat/300389608',
  langyor: 'http://vocab.getty.edu/aat/300389608',
  langypk: 'http://vocab.getty.edu/aat/300389617',
  langyue: 'http://vocab.getty.edu/aat/300388135',
  langyuk: 'http://vocab.getty.edu/aat/300389615',
  langza: 'http://vocab.getty.edu/aat/300443762',
  langzap: 'http://vocab.getty.edu/aat/300389625',
  langzen: 'http://vocab.getty.edu/aat/300389629',
  langzh: 'http://vocab.getty.edu/aat/300388113',
  langzha: 'http://vocab.getty.edu/aat/300443762',
  langzrp: 'http://vocab.getty.edu/aat/300389626',
  langzu: 'http://vocab.getty.edu/aat/300389637',
  langzul: 'http://vocab.getty.edu/aat/300389637',
};

// may not be needed, other than supporting language codes - since identifiers are not dynamically generated, we know which identifiers are available before build time
function hasIdentifier(name) {
  return IDENTIFIERS.hasOwnProperty(name);
}
// may not be needed - since identifiers are not dynamically generated, we know which identifiers are available before build time
function getIdentifier(name) {
  if (hasIdentifier(name)) {
    return IDENTIFIERS[name];
  }
  throw new InternalServerError(
    "An undefined identifier was referenced: '" +
      name +
      "'. Developer to correct the reference or ensure the identifier is defined."
  );
}

// return the identifier key for a language code - all language identifiers are prepended with 'lang'
function _getLanguageIdentifierKey(languageCode) {
  return 'lang' + languageCode;
}

function hasLanguageIdentifier(languageCode) {
  return hasIdentifier(_getLanguageIdentifierKey(languageCode));
}

function getLanguageIdentifier(languageCode) {
  const key = _getLanguageIdentifierKey(languageCode);
  if (hasIdentifier(key)) {
    return IDENTIFIERS[key];
  }
  throw new InternalServerError(
    "A language identifier is not defined for the '" +
      languageCode +
      "' language code. Developer to correct the reference or ensure the identifier is defined."
  );
}

export {
  IDENTIFIERS,
  hasIdentifier,
  getIdentifier,
  hasLanguageIdentifier,
  getLanguageIdentifier,
};
