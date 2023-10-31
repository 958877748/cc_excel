const fs = require('fs')
const path = require('path')

try {
	var nodexlsx = require('node-xlsx')
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
	 * 面板上的label 可显示一段文字
	 */
	stateLabel
	/**
	 * 在面板上显示文字
	 * @param {string} str 
	 */
	showState(str) {
		this.stateLabel.innerText = str
	}
	constructor(stateLabel) {
		this.stateLabel = stateLabel
		this.projectPath = Editor.Project.path
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
		if (!nodexlsx) {
			this.log('please npm install !!!')
			return
		}
		this.showState('start generate')

		let xlsxPaths = this.readFileList(this.projectPath + '/excel')
		let xlsxs = this.parseXlsx(xlsxPaths)

		this.save_ConfigTypeDefind_ts(xlsxs)

		this.save_dataManager_ts(xlsxs)

		this.save_datas_json(xlsxs)

		//刷新资源管理器
		Editor.assetdb.refresh('db://assets/data/')

		this.showState('generate complete')
	}
	/**
	 * 获取属性的类型
	 * @param {{name:string,data:Array<Array<string|number>>}} sheet 
	 * @param {number} index 
	 */
	getType(sheet, index) {
		let len = Math.min(12, sheet.data.length)
		let isStr = false
		for (let i = 2; i < len; i++) {
			const data = sheet.data[i][index]
			if (typeof data == 'string') {
				isStr = true
			}
		}
		let isArray = false
		for (let i = 2; i < len; i++) {
			const data = sheet.data[i][index] + ''
			if (data.includes('|')) {
				isArray = true
			}
		}
		if (isArray) {
			// 假设全是数字 循环找只要有一个不是数字就字符串
			isStr = false
			for (let i = 2; i < len; i++) {
				const data = sheet.data[i][index] + ''
				if (data.includes('|')) {
					let array = data.split('|')
					for (let k = 0; k < array.length; k++) {
						if (isNaN(Number(array[k]))) {
							isStr = true
						}
					}
				}
			}
			if (isStr) {
				return 'Array<string>'
			} else {
				return 'Array<number>'
			}
		} else {
			if (isStr) {
				return 'string'
			} else {
				return 'number'
			}
		}
	}
	/**
	 * 把字符串保存为一个文件
	 * @private
	 * @param {string} str 
	 * @param {string} file 
	 */
	saveFile(str, file) {
		let baseurl = this.projectPath + '/assets/data'
		let url = path.join(baseurl, file)
		fs.writeFileSync(url, str, { encoding: 'utf-8' })
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
	 * @param {string} dir 目录
	 * @param {string[]} fileList 文件列表
	 * @returns 文件列表
	 */
	readFileList(dir, fileList = []) {
		//读取一个目录下的所有文件/目录
		let files = fs.readdirSync(dir)
		files.forEach(file => {
			// 拼接为全路径 
			let fullPath = path.join(dir, file)
			let stats = fs.statSync(fullPath)
			//如果这是一个目录
			if (stats.isDirectory()) {
				//读取目录里的文件
				this.readFileList(path.join(dir, file), fileList)
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
		let str = ''
		str += 'class Data {\n'
		str += '    protected _data: Array<any>\n'
		str += '    /** ID */\n'
		str += '    get ID(): number { return this._data[0] }\n'
		str += '}\n'

		for (const xlsxName in xlsxs) {
			let xlsx = xlsxs[xlsxName]
			let sheet1 = xlsx[0]
			if (sheet1.data.length < 3) {
				this.log(`表 ${xlsxName} 行数小于3行, 跳过`)
				return
			}
			/** 
			 * 第一行 中文名
			 * @type {string[]}
			 */
			let Chinese_name_list = sheet1.data[0]
			/** 
			 * 第二行 英文名
			 * @type {string[]}
			 */
			let English_name_list = sheet1.data[1]

			// 保存类型到sheet中 第一个是id number类型
			sheet1.type = ['number']

			//拼凑ts文件的字符串
			str += `export class ${xlsxName}Data extends Data {\n`
			//拼凑每一条属性
			let delect = 0
			for (let i = 1; i < English_name_list.length; i++) {
				let Chinese_name = Chinese_name_list[i]
				let English_name = English_name_list[i]
				//注释
				str += `    /** ${Chinese_name} */\n`
				//变量名
				//get DiamondReward(): number { return this._data[1] }
				str += `    get ${English_name}(): `
				//类型
				let type = this.getType(sheet1, i)
				sheet1.type.push(type)
				str += type
				//换行
				str += ` { return this._data[${i - delect}] }\n`
			}
			str += `} \n`
		}
		//写入文件保存
		this.saveFile(str, "ConfigTypeDefind.ts")
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
			if (sheet1.data.length < 3) {
				return
			}

			importContent += `import { ${xlsxName}Data } from "./ConfigTypeDefind"\n`
			defindContent += `    export let ${xlsxName}Datas: Array<${xlsxName}Data>\n`
			defindContent += `    export let ${xlsxName}DatasById: { [key in number]: ${xlsxName}Data }\n`
			funcContent += `        ${xlsxName}Datas = arrayData(${xlsxName}Data, "${xlsxName}", datas)\n`
			funcContent += `        ${xlsxName}DatasById = getsById(${xlsxName}Datas)\n`
		}
		//在这个三个位置替换字符串
		clazData = clazData.replace("@@import", importContent)
		clazData = clazData.replace("@@varDefined", defindContent)
		clazData = clazData.replace("@@funcContent", funcContent)
		//保存文件
		this.saveFile(clazData, "DataManager.ts")
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
			if (sheet1.data.length < 3) {
				return
			}
			let English_name_list = sheet1.data[1]
			let types = sheet1.type
			//从第3行(下标为2)开始读取数据 生成数据对象
			for (let row = 2; row < sheet1.data.length; row++) {
				let rowdatas = sheet1.data[row]
				if (rowdatas.length === 0) continue
				//一行代表一个 data(数据对象) 
				let data = []
				//给这个 data(数据对象) 添加表里的属性 
				for (let i = 0; i < English_name_list.length; i++) {
					let type = types[i]
					let value = rowdatas[i]
					switch (type) {
						case 'number':
							data.push(value)
							break;
						case 'string':
							data.push(`${value}`)
							break;
						case 'Array<number>':
							let array_number = []
							let value_str = value + ''
							value_str.split('|').forEach(v => {
								array_number.push(Number(v))
							})
							data.push(array_number)
							break;
						case 'Array<string>':
							data.push(value.split('|'))
							break;
					}
				}
				json[xlsxName][data[0]] = data
			}
		}
		this.saveFile(JSON.stringify(json), 'datas.json')
	}
}

module.exports = Excel
