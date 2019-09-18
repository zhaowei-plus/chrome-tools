const today = dayjs().format('YYYY/MM/DD')
const todayEnd = dayjs().format('YYYY/MM/DD 23:59:59')
const day = dayjs().day() || 7
const weekStart = dayjs(today).subtract(day - 1, 'day')
let weekEnd
if (day < 5) {
  weekEnd = dayjs(todayEnd).add(5 - day, 'day')
} else {
  weekEnd = dayjs(todayEnd).subtract(day - 5, 'day')
}

// 注册组件
Vue.use(vant)

function initCookie () {
  return new Promise((resolve) => {
    let cookies = {}
    chrome.cookies.getAll({ domain: config.domain }, res => {
      res.forEach(item => {
        if (['userName', 'userId'].some(x => x === item.name)) {
          cookies[item.name] = decodeURIComponent(item.value)
        }
      })
      cookies.orgId = config.orgId
      resolve(cookies)
    })
  })
}

function renderForm (formArr, projectType) {
  const ins = Vue.extend({
    render (h) {
      return h('div', [
        h('span', { style: { fontSize: '16px', fontWeight: 'bold' } }, '项目进度'),
        h('ul', { class: 'form-list' }, formArr.map(item => h('li', [
          `【${item.type}】${item.project}`,
          h('ul', [
            projectType[item.type].hasProgress ? h('li', `进度：${item.progress}%`) : null,
            projectType[item.type].startText ? h('li', `${projectType[item.type].startText}：${item.startDevDate || '-'}`) : null,
            projectType[item.type].endText ? h('li', `${projectType[item.type].endText}：${item.endDevDate || '-'}`) : null,
            h('li', `具体内容：${item.desc || '-'}`)
          ])
        ])))
      ])
    }
  })
  return {
    html: new ins({
      el: document.createElement('div')
    }).$el.innerHTML,
    text: `本周主要工作：${formArr[0].project} 进度：${formArr[0].progress}`
  }
}

function renderGroup (projectArr, projectType) {
  const ins = Vue.extend({
    render (h) {
      return h('div', [
        h('p', { style: { fontSize: '16px', fontWeight: 'bold' } }, '小组工作'),
        h('ul', { class: 'form-list' }, projectArr.map(item => h('li', [
          h('span', { style: { fontSize: '14px' } }, item.name),
          h('ul', item.users.map(user => {
            const { hasProgress, startText, endText } = projectType[user.type]
            return h('li', [
              h('span', { style: { fontWeight: 'bold' } }, `@${user.name}`),
              user.type && user.type !== '无' ? h('span', [` - ${user.type}`]) : null,
              hasProgress ? h('span', [` - 进度: ${user.progress}%`]) : null,
              startText ? h('span', [` - ${startText}：${user.startDevDate}`]) : null,
              endText ? h('span', [` - ${endText}: ${user.endDevDate}%`]) : null,
              h('span', [` - 具体内容：${user.desc || '-'}`])
            ])
          }))
        ])))
      ])
    }
  })
  return {
    html: new ins({
      el: document.createElement('div')
    }).$el.innerHTML,
    text: `小组工作：${projectArr[0].name} @${projectArr[0].users[0].name}`
  }
}

const service = {
  receiveUids: [],

  getReceive (cookie) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        url: config.origin + '/access/WorkReportSrv/getlaterrecversbytype',
        contentScriptQuery: 'fetchPost',
        data: {
          orgId: cookie.orgId,
          type: 2
        }
      }, function (response) {
        // console.log(response)
        if (response && response.retcode === 0) {
          resolve(response.data.infos.map(x => ({ ...x, readstatus: 0 })))
        } else {
          reject(response)
        }
      })
    })
  },

  getData (
    type,
    cookie,
    form,
    dataType = 1,
    projectType
  ) {
    const { text, html } = dataType === 1
      ? renderForm(form, projectType)
      : renderGroup(form, projectType)
    const record = {
      begindate: weekStart.format('YYYY/MM/DD'),
      enddate: weekEnd.format('YYYY/MM/DD'),
      donemsg: text,
      undonemsg: '',
      needcoor: '',
      nextweekplan: '',
      begindate_ms: String(weekStart.valueOf()),
      enddate_ms: String(weekEnd.valueOf())
    }
    return {
      orgId: cookie.orgId,
      info: {
        bType: 2, // 1 日报，2 周报
        status: type, // 0 发布 2 草稿
        uniqueId: '',
        publishTime: '',
        uid: cookie.userId,
        name: cookie.userName,
        photoUrls: [],
        straddr: '',
        recvuserinfolist: this.receiveUids,
        recordRichtext: JSON.stringify({
          ...record,
          donemsg: html,
          stringForm: JSON.stringify(form)
        }),
        record: {
          ...record
        },
        depmsg: {
          depId: 0,
          depName: ''
        },
        templaterecord: '',
        remark: '',
        remindTime: 0,
        timerSend: 0,
        wrrId: 0
      }
    }
  },

  publish (data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        // url: config.origin + '/access/WorkReportSrv/adddraftbox',
        url: config.origin + (
          data.info.status === 0
            ? '/access/WorkReportSrv/addWorkReport'
            : '/access/WorkReportSrv/adddraftbox'
        ),
        contentScriptQuery: 'fetchPost',
        data
      }, function (response) {
        if (response && response.retcode === 0) {
          resolve()
        } else {
          reject(response)
        }
      })
    })
  },

  getDeptUsers (cookie) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        url: config.origin + '/access/Contacts/getDepartUsers',
        contentScriptQuery: 'fetchPost',
        data: {
          deptIds: [config.deptId],
          orgId: cookie.orgId
        }
      }, function (response) {
        if (response && response.retcode === 0) {
          resolve(response.data.users)
        } else {
          reject(response)
        }
      })
    })
  },

  findReportById (cookie, uids) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        url: config.origin + '/access/WorkReportSrv/selectRecvWorkReport',
        contentScriptQuery: 'fetchPost',
        data: {
          begintime: weekStart.format('YYYY-MM-DD'),
          endtime: weekEnd.add(2, 'day').format('YYYY-MM-DD'),
          orgId: cookie.orgId,
          pageCount: 20,
          pageId: 1,
          readstatus: 1,
          typelist: [2],
          // typelist: [0],
          userIdlist: uids
        }
      }, function (response) {
        if (response && response.retcode === 0) {
          resolve(response.data.infos.filter(x => x.bType === 2))
        } else {
          reject(response)
        }
      })
    })
  },

  getConfig () {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        url: `https://iming.work/demo/statics/js/report-tools-config.js?ts=${Date.now()}`,
        contentScriptQuery: 'fetchGet'
      }, data => {
        resolve(data)
      })
    })
  }
}

new Vue({
  data () {
    return {
      // 配置
      project: [],
      projectType: [],
      groupLeader: [],
      // 工作列表
      workList: [],
      cookies: {},
      // 选项目弹层
      // showProject: false,
      // 选项目类型弹层
      // showProjectType: false,
      projectGroup: '企业服务手厅组',
      // 提交loading
      submitLoading: false,
      // 当前编辑的项目索引 `[index]_[field]`
      // currentIndex: 0,
      // 保存本地的handler
      saveLocalTimer: null,
      // 保存本地的loading
      saveLocalLoading: undefined,
      deptUsers: [],
      selectedDeptUsers: [],
      // 功能类型
      renderType: 1 // 1 普通员工，2 小组长
    }
  },

  watch: {
    workList: {
      handler (val, old) {
        if (old && old.length === 0 || this.renderType === 2) {
          // 初始化时 + 小组长 无需保存
          return
        }
        if (this.saveLocalTimer) {
          clearTimeout(this.saveLocalTimer)
        }
        this.saveLocalLoading = true
        this.saveLocalTimer = setTimeout(() => {
          chrome.storage.local.set({ reportLocal: val } , () => {
            this.saveLocalLoading = false
          })
        }, 1000)
      },
      deep: true
    }
  },

  async created () {
    // 初始化配置
    const { project, projectType, groupLeader = [] } = await service.getConfig()
    this.project = project
    this.projectType = projectType
    this.groupLeader = config.groupLeader.concat(groupLeader)
    this.cookies = await initCookie()
    if (this.groupLeader.some(x => x === this.cookies.userId)) {
      // 小组长
      this.renderType = 2
      this.$toast.loading({
        mask: true,
        message: '获取人员...'
      })
      this.deptUsers = await service.getDeptUsers(this.cookies)
      this.$toast.clear()
    } else {
      // 获取本地缓存
      chrome.storage.local.get(['reportLocal'], (result) => {
        if (result && result.reportLocal && result.reportLocal.length) {
          this.workList = result.reportLocal
        }
      })
    }
    // 获取接收人
    service.receiveUids = await service.getReceive(this.cookies)
  },

  methods: {
    addWork () {
      this.workList.push({
        project: '手厅-h5',
        version: '',
        progress: 50,
        type: '开发中',
        desc: '',
        startDevDate: '',
        endDevDate: ''
      })
    },

    async submit () {
      let valideIndex = -1
      this.workList.forEach((item, i) => {
        if (!item.version || !item.version.trim()) {
          valideIndex = i
          return
        }
      })
      if (valideIndex > -1) {
        this.$toast(`${this.workList[valideIndex].project} 的版本号必填！`)
        return
      }

      // 将版本号挂载到项目上再提交
      const workListTransfer = this.workList.map(item => ({
        ...item,
        project: `${item.project} ${item.version}`
      }))
      const data = service.getData(
        service.receiveUids.length === 0 ? 2 : 0,
        this.cookies,
        workListTransfer,
        undefined,
        this.projectType
      )
      if (service.receiveUids.length === 0) {
        await this.$dialog.confirm({
          message: '未获取到你周报的接收人，周报会发送至草稿箱，确认继续么？'
        })
      }

      this.submitLoading = true
      await service.publish(data).catch(() => {
        this.submitLoading = false
        vant.Toast('提交失败')
        return Promise.reject()
      })
      vant.Toast('提交成功')
      this.workList = []
      this.submitLoading = false
    },

    async genLeader () {
      if (this.selectedDeptUsers.length === 0) {
        this.$toast('请选择人员')
        return
      }
      // 拉取人员周报，汇总
      this.$toast.loading({
        mask: true,
        message: '查找人员周报...'
      })
      const uids = this.selectedDeptUsers.map(x => Number(x.uid))
      const reports = await service.findReportById(this.cookies, uids)

      // 提示未提交人员
      const submitUids = reports.map(x => {
        try {
          JSON.parse(JSON.parse(x.recordRichtext).stringForm)
          return Number(x.uid)
        } catch (e) {
          return undefined
        }
      }).filter(Boolean)
      const noSubmitUids = uids.filter(x => submitUids.every(y => x !== y))
      if (noSubmitUids.length) {
        const name = noSubmitUids.map(uid => this.deptUsers.find(x => Number(x.uid) === uid).name).join('、')
        await this.$dialog.confirm({
          message: `${name} 未提交或未按照规范提交周报，是否继续？`
        })
      }

      const projects = []
      reports.forEach(user => {
        let userWorkList
        try {
          userWorkList = JSON.parse(JSON.parse(user.recordRichtext).stringForm)
        } catch (e) {
        }
        if (userWorkList) {
          userWorkList.forEach(work => {
            const userItem = {
              name: user.name,
              uid: user.uid,
              ...work
            }
            const projectIndex = projects.findIndex(x => x.name === work.project)
            if (projectIndex > -1) {
              projects[projectIndex].users.push(userItem)
            } else {
              projects.push({
                name: work.project,
                users: [userItem]
              })
            }
          })
        }
      })
      this.$toast.loading({
        mask: true,
        message: '提交中...'
      })
      await service.publish(service.getData(2, this.cookies, projects, 2, this.projectType))
      this.$toast.success('提交至草稿成功')
    },

    toogleUsers (item) {
      let index = this.selectedDeptUsers.findIndex(x => x.uid === item.uid)
      if (index > -1) {
        this.selectedDeptUsers.splice(index, 1)
      } else {
        this.selectedDeptUsers.push(item)
      }
    }
  },

  render (h) {
    if (!this.project) {
      return h('span')
    }

    const renderButton = (type, event, text, disabled = false, loading = false) => {
      return h('van-button', {
        props: {
          type,
          block: true,
          disabled,
          loading
        },
        on: {
          click: event
        }
      }, text)
    }

    const addButton = () => {
      const result = [renderButton('primary', this.addWork, '添加项目')]
      result.push(renderButton('danger', this.submit, '发布', !this.workList.length, this.submitLoading))
      return h('div', { class: 'bottom-button show-top' }, result)
    }

    const renderWork = (item, i) => {
      return h('div', { class: 'mb10 relative' }, [
        h('van-field', {
          props: {
            required: true,
            label: '项目',
            readonly: true
          }
        }, [
          h('div', { slot: 'input' }, [
            h('select', {
              class: 'select-type',
              value: this.projectGroup,
              on: {
                change: (e) => {
                  this.projectGroup = e.target.value
                  this.workList[i].project = this.project[this.projectGroup][0]
                  this.$set(this.workList, i, this.workList[i])
                }
              }
            }, Object.keys(this.project).map(x => h('option', { attrs: { value: x } }, x))),
            h('select', {
              class: 'select-type',
              attrs: {
                value: item.project
              },
              on: {
                change: (e) => {
                  this.workList[i].project = e.target.value
                  this.$set(this.workList, i, this.workList[i])
                }
              }
            }, this.projectGroup ? this.project[this.projectGroup].map(x => h('option', { attrs: { value: x } }, x)) : [])
          ])
        ]),
        h('van-field', {
          attrs: {
            placeholder: '请输入，例如v1.0'
          },
          props: {
            label: '版本',
            required: true,
            value: item.version
          },
          on: {
            input: (val) => {
              this.workList[i].version = val
              this.$set(this.workList, i, this.workList[i])
            }
          }
        }),
        h('van-field', {
          props: {
            required: true,
            label: '类型',
            readonly: true
          }
        }, [
          h('select', {
            attrs: {
              value: item.type
            },
            class: 'select-type',
            slot: 'input',
            on: {
              change: (e) => {
                this.workList[i].type = e.target.value
                this.$set(this.workList, i, this.workList[i])
              }
            }
          }, Object.keys(this.projectType).map(x => h('option', { attrs: { value: x, selected: item.type === x } }, x)))
        ]),
        this.projectType[item.type].hasProgress ?
          h('van-field', {
            props: {
              required: true,
              label: '进度(%)',
              value: item.endDevDate
            }
          }, [
            h('van-stepper', {
              props: {
                value: item.progress,
                min: 0,
                max: 100,
                step: 5,
                integer: true
              },
              slot: 'input',
              on: {
                change: (val) => {
                  this.workList[i].progress = val
                  this.$set(this.workList, i, this.workList[i])
                }
              }
            })
          ]) : null,
        this.projectType[item.type].startText ?
          h('van-field', {
            attrs: {
              placeholder: '请输入'
            },
            props: {
              label: this.projectType[item.type].startText,
              value: item.startDevDate
            },
            on: {
              input: (val) => {
                this.workList[i].startDevDate = val
                this.$set(this.workList, i, this.workList[i])
              }
            }
          }) : null,
        this.projectType[item.type].endText ?
          h('van-field', {
            attrs: {
              placeholder: '请输入'
            },
            props: {
              label: this.projectType[item.type].endText,
              value: item.endDevDate
            },
            on: {
              input: (val) => {
                this.workList[i].endDevDate = val
                this.$set(this.workList, i, this.workList[i])
              }
            }
          }) : null,
        h('van-field', {
          attrs: {
            rows: 4,
            placeholder: '请输入',
            autosize: true
          },
          props: {
            label: '具体内容',
            type: 'textarea',
            value: item.desc
          },
          on: {
            input: (val) => {
              this.workList[i].desc = val
              this.$set(this.workList, i, this.workList[i])
            }
          }
        }),
        h('div', {
          class: 'absolute r0 t0 bg-main p10',
          on: {
            click: async () => {
              await this.$dialog.confirm({ message: '确定要删除吗?' })
              this.workList.splice(i, 1)
            }
          }
        }, [ h('van-icon', { class: 'c-fff f18', props: { name: 'delete' } }) ])
      ])
    }

    const addUserList = () => {
      return h('div',
        { style: { height: '450px' }, class: 'bg-fff mt10', attrs: { 'overflow-a': true } },
        this.deptUsers.map((item, i) => h('div', { class: 'p10 mbb' }, [h('van-checkbox', {
          props: {
            'checked-color': '#07c160',
            value: this.selectedDeptUsers.some(x => x.uid === item.uid)
          },
          on: {
            input: () => this.toogleUsers(item, i)
          }
        }, item.name)]))
      )
    }

    let pageChild = [h('h3', { class: 'f20 mb10' }, [
      h('span', ['周报辅助工具']),
      // h('span', { style: { fontSize: '12px' } }, '编辑的周报不会被同步')
    ])]
    if (this.renderType === 1) {
      pageChild = pageChild
        .concat(this.workList.length ? this.workList.map(renderWork) : h('div', { class: 'tc c-999 mt30 pt30' }, [h('van-icon', { props: { name: 'coupon-o' }, style: { fontSize: '50px' } }), h('p', '请添加项目~')]))
        .concat(addButton())
        .concat(this.saveLocalLoading !== undefined ? h('div', { class: 'save-loading' }, this.saveLocalLoading ? '正在保存至本地...' : '保存成功!') : [])
      return h('div', { style: { overflow: 'auto', height: '500px' } }, pageChild)
    }
    // else if (this.renderType === 2) {
    // }
    pageChild = pageChild
      .concat(h('div', { class: 'c-666' }, ['我尊贵的vip，选择小组成员的周报内容合成吧']))
      .concat(addUserList())
      .concat(h('div', { class: 'fixed b0 width-100 l0 shadow-top p10 bg-fff' }, [renderButton('primary', this.genLeader, '一键生成至草稿')]))

    return h('div', pageChild)
  }
}).$mount('#app')
