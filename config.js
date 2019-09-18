// const project = {
//   '企业服务手厅组': [
//     '手厅-h5',
//     '手厅-后台',
//     'saas-后台',
//     'saas-h5',
//     'saas-超管',
//     '运营平台',
//     '新超管',
//     '福利日常',
//     ''
//   ],
//   '其它': [
//     '小组分享',
//     '个人学习',
//     '组内贡献',
//     '博客笔记'
//   ],
//   '本体组': [''],
// }
// const projectType = ['已发布', '已提测', '开发中', '已完成', '待跟进', '已中断', '已评审']

const APP_CONFIG = {
  dev: {
    host: 'web.jituancaiyun.net',
    origin: 'http://web.jituancaiyun.net',
    domain: '.jituancaiyun.net',
    orgId: '83817',
    groupLeader: [
      '269840'
    ],
    deptId: 2 // 万分测试 - 部门2
  },
  pro: {
    host: 'web.jituancaiyun.com',
    origin: 'https://web.jituancaiyun.com',
    domain: '.jituancaiyun.com',
    orgId: '5717888888',
    groupLeader: [
      '106144',
      '10101001204798664',
      '10101001204417256',
      '10101001191214848'
    ],
    deptId: 21
  }
}

const config = APP_CONFIG[/* env */'pro']
