const fs = require('fs')
const path = require('path')

try {
	const nodexlsx = require('node-xlsx')
} catch (error) {
	Editor.Dialog.messageBox({
		title: '提示',
		message: 'please npm install !!!'
	})
}

class Excel {
	/**
	 * 当前项目路径
	 * @private
	 * @type {string} tips: D:/project/name
	 */
	projectPath
	/**
	 * 自定义类型信息
	 * @type {{[x:string]:{type:string,getValue:Function}}}
	 */
	allTypeData
	constructor() {
		this.projectPath = Editor.Project.path
		this.allTypeData = {
			'int': {
				type: 'number',
				getValue: this.toNumber
			},
			'list<int>': {
				type: 'Array<number>',
				getValue: this.toNumber
			},

			'float': {
				type: 'number',
				getValue: this.toNumber
			},
			'list<float>': {
				type: 'Array<number>',
				getValue: this.toListNumber
			},

			'str': {
				type: 'string',
				getValue: this.toString
			},
			'string': {
				type: 'string',
				getValue: this.toString
			},
			'list<string>': {
				type: 'Array<string>',
				getValue: this.toListString
			},

			'boo': {
				type: 'boolean',
				getValue: this.toBoolean
			},
			'bool': {
				type: 'boolean',
				getValue: this.toBoolean
			},
			'boolean': {
				type: 'boolean',
				getValue: this.toBoolean
			}
		}
	}
	/**
	 * @param {string} str 
	 */
	log(str) {
		Editor.log(str)
	}
	/**
	 * 显示一个弹窗消息
	 * @param {string} message 
	 */
	showMessage(message) {
		Editor.Dialog.messageBox({
			title: '提示',
			message: message
		})
	}
	toNumber(value) {
		if (value) {
			return Number(value)
		} else {
			return 0
		}
	}
	toString(value) {
		if (value) {
			return value + ''
		} else {
			return ''
		}
	}
	toBoolean(value) {
		if (value === undefined) {
			return false
		} else {
			if (value)
				return true
			else
				return false
		}
	}
	toListNumber(value) {
		if (value === undefined) {
			return null
		} else {
			if (value.split == null) {
				return [Number(value)]
			}
			let str = value.replace(/,/g, '|')
			let list = str.split('|')
			let arr = list.reduce((a, c, i, the) => {
				a.push(Number(c))
				return a
			}, [])
			return arr
		}
	}
	toListString(value) {
		if (value === undefined) {
			return null
		} else {
			if (value.split) {
				return value.split(',')
			} else {
				debugger
			}
		}
	}
	toJson() {
		if (nodexlsx == null) {
			this.log('please npm install !!!')
			return
		}
		let saveRoot = this.projectPath + '/assets/data'
		let xlsxRoot = this.projectPath + '/excel'

		let xlsxPaths = this.readFileList(fs, xlsxRoot)
		let xlsxs = this.parseXlsx(xlsxPaths)

		this.save_ConfigTypeDefind_ts(xlsxs, saveRoot)

		this.save_dataManager_ts(xlsxs, saveRoot)

		this.save_datas_json(xlsxs, saveRoot)

		//刷新资源管理器
		Editor.assetdb.refresh('db://assets/data/')
	}
	/**
	 * 解析所有excel文件
	 * @private
	 * @param {string[]} xlsxPaths 所有excel文件路径列表
	 * @returns 返回一个对象 对象的key为表名 value为解析后的对象
	 */
	parseXlsx(xlsxPaths) {
		let xlsxs = {}
		let nodexlsx = require('node-xlsx')
		xlsxPaths.forEach(v => {
			let extname = path.extname(v)
			if (extname === ".xlsx" || extname === ".xls") {
				let dirname = path.basename(v)

				let xlsxName = dirname.split('.')[0]
				xlsxName = xlsxName.split('（')[0]
				xlsxName = xlsxName.split('(')[0]

				xlsxs[xlsxName] = nodexlsx.parse(v)
			}
		})
		return xlsxs
	}
	/**
	 * 递归读取目录下所有文件
	 * @private
	 * @param {*} fs 导入的fs模块
	 * @param {string} dir 目录
	 * @param {string[]} fileList 文件列表
	 * @returns 文件列表
	 */
	readFileList(fs, dir, fileList = []) {
		//读取一个目录下的所有文件/目录
		let files = fs.readdirSync(dir)
		files.forEach(file => {
			// 拼接为全路径 
			let fullPath = path.join(dir, file)
			let stats = fs.statSync(fullPath)
			//如果这是一个目录
			if (stats.isDirectory()) {
				//读取目录里的文件
				this.readFileList(fs, path.join(dir, file), fileList)
			} else {
				//这是一个文件,文件路径加入列表
				fileList.push(fullPath)
			}
		})
		return fileList
	}
	/**
	 * @private
	 * @param {*} xlsxs 
	 * @param {*} saveRoot 
	 * @returns 
	 */
	save_ConfigTypeDefind_ts(xlsxs, saveRoot) {
		let str = `class Data {
	protected _data: Array<any>
	/** ID */
	get ID(): number { return this._data[0] }
}\n`
		for (const xlsxName in xlsxs) {
			let xlsx = xlsxs[xlsxName]
			let sheet1 = xlsx[0]
			if (sheet1.data.length < 4) {
				Editor.log(`表 ${xlsxName} 行数小于3行,跳过`)
				return
			}
			/** @type {string[]} */
			let line1 = sheet1.data[0]
			/** @type {string[]} */
			let line2 = sheet1.data[1]
			/** @type {string[]} */
			let line3 = sheet1.data[2]

			//拼凑ts文件的字符串
			str += `export class ${xlsxName}Data extends Data{\n`
			//拼凑每一条属性
			let delect = 0
			for (let i = 1; i < line3.length; i++) {
				/** 变量中文描述 */
				let cnName = line1[i]
				/** 变量英文名字 */
				let enName = line2[i]
				/** 变量类型 */
				let type = line3[i]
				if (type === undefined) {
					delect++
					continue
				}
				/** @type {string} 把字符串转换为小写 */
				let lowType = type.toLowerCase()
				//加上注释
				str += `    /** ${cnName} */\n`
				//变量名字
				//get DiamondReward(): number { return this._data[1] }
				str += `    get ${enName}(): `
				//取出自定义的类型信息
				let typeData = allTypeData[lowType]
				if (typeData) {
					str += typeData.type
				} else {
					str += 'any'
					this.log('[未知类型]' + type, __filename)
				}
				//换行
				str += ` { return this._data[${i - delect}] }\n`
			}
			str += `}\n`
		}
		//写入文件保存
		fs.writeFileSync(path.join(saveRoot, "ConfigTypeDefind.ts"),
			str, { encoding: 'utf-8' })
	}
	/**
	 * @private
	 * @param {*} xlsxs 
	 * @param {*} saveRoot 
	 * @returns 
	 */
	save_dataManager_ts(xlsxs, saveRoot) {
		let importContent = ""
		let defindContent = ""
		let funcContent = ""
		let url = path.join(__dirname, 'DataManager.txt')
		let clazData = fs.readFileSync(url, { encoding: "utf-8" })
		for (const xlsxName in xlsxs) {
			let xlsx = xlsxs[xlsxName]
			let sheet1 = xlsx[0]
			if (sheet1.data.length < 4) {
				return
			}
			//id的类型
			let type = sheet1.data[2][0]
			let lowType = type.toLowerCase()
			let idType = allTypeData[lowType].type
			if (!idType) continue

			importContent += `import {${xlsxName}Data} from "./ConfigTypeDefind"\n`
			defindContent += `export let ${xlsxName}Datas:Array<${xlsxName}Data>\n`
			defindContent += `export let ${xlsxName}DatasById:{[key in ${idType}]:${xlsxName}Data}\n`
			funcContent += `${xlsxName}Datas=arrayData(${xlsxName}Data,"${xlsxName}",datas)\n`
			funcContent += `${xlsxName}DatasById=getsById(${xlsxName}Datas)\n`
		}
		//在这个三个位置替换字符串
		clazData = clazData.replace("@@import", importContent)
		clazData = clazData.replace("@@varDefined", defindContent)
		clazData = clazData.replace("@@funcContent", funcContent)
		//保存文件

		fs.writeFileSync(path.join(saveRoot, "DataManager.ts"),
			clazData, { encoding: 'utf-8' })
	}
	/**
	 * @private
	 * @param {*} xlsxs 
	 * @param {*} saveRoot 
	 * @returns 
	 */
	save_datas_json(xlsxs, saveRoot) {
		let json = {}
		for (const xlsxName in xlsxs) {
			json[xlsxName] = {}
			let xlsx = xlsxs[xlsxName]
			let sheet1 = xlsx[0]
			let sheetdata = sheet1.data
			if (sheetdata.length < 4) {
				return
			}
			let enNames = sheetdata[1]
			let types = sheetdata[2]
			//从第4行开始读取数据 生成数据对象
			a: for (let row = 4; row < sheetdata.length; row++) {
				let rowdatas = sheetdata[row]
				if (rowdatas.length === 0) continue
				//一行代表一个 data(数据对象) 
				let data = []
				//给这个 data(数据对象) 添加表里的属性 
				for (let i = 0; i < enNames.length; i++) {
					let type = types[i]
					if (type === undefined) continue
					let value = rowdatas[i]
					let lowType = type.toLowerCase()
					let typeData = allTypeData[lowType]
					if (typeData) {
						data.push(typeData.getValue(value))
					}
				}
				json[xlsxName][data[0]] = data
			}
		}

		let str = JSON.stringify(json)
		fs.writeFileSync(path.join(saveRoot, "datas.json")
			, str, { encoding: 'utf-8' })
	}
}

module.exports = Excel
