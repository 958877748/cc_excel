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

class Sheet {
	/**
	 * @type {string}
	 */
	name
	/**
	 * @type {Array<Array<string|number>>}
	 */
	data
	/**
	 * @type {Array<string>}
	 */
	type
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
	 * @type {Record<string,Array<Sheet>>}
	 */
	xlsxs
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
	toJson() {
		if (!nodexlsx) {
			this.log('please npm install !!!')
			return
		}
		this.showState('start generate')

		let xlsxPaths = this.readFileList(this.projectPath + '/excel')
		this.xlsxs = this.parseXlsx(xlsxPaths)

		this.generateConfigTypeDefind()

		this.generateDataManager()

		this.generateDatas()

		this.xlsxs = null

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
	 * @param {(sheet:Sheet)=>void} callBack 
	 */
	forEachSheet(callBack) {
		for (const name in this.xlsxs) {
			let xlsx = this.xlsxs[name]
			for (let i = 0; i < xlsx.length; i++) {
				const sheet = xlsx[i]
				if (sheet.data[0][0] == 'export') {
					if (sheet.data.length >= 3) {
						callBack(sheet)
					}
				}
			}
		}
	}
	/**
	 * 生成 ConfigTypeDefind.ts
	 */
	generateConfigTypeDefind() {
		let str = ''
		str += 'class Data {\n'
		str += '    protected _data: Array<any>\n'
		str += '    /** ID */\n'
		str += '    get ID(): number { return this._data[0] }\n'
		str += '}\n'
		this.forEachSheet(sheet => {
			/** 
			 * 第一行 中文名
			 * @type {string[]}
			 */
			let chineseNames = sheet.data[0]
			/** 
			 * 第二行 英文名
			 * @type {string[]}
			 */
			let englishNames = sheet.data[1]

			// 保存类型到sheet中 第一个是id number类型
			sheet.type = ['number']

			//拼凑ts文件的字符串
			str += `export class ${sheet.name}Data extends Data {\n`
			//拼凑每一条属性
			let delect = 0
			for (let i = 1; i < englishNames.length; i++) {
				let chineseName = chineseNames[i]
				let englishName = englishNames[i]
				// 中文注释
				str += `    /** ${chineseName} */\n`
				// 英文变量名
				str += `    get ${englishName}(): `
				// 类型
				let type = this.getType(sheet, i)
				sheet.type.push(type)
				str += type
				// 换行
				str += ` { return this._data[${i - delect}] }\n`
			}
			str += `} \n`
		})
		//写入文件保存
		this.saveFile(str, "ConfigTypeDefind.ts")
	}
	/**
	 * 生成 DataManager.ts
	 */
	generateDataManager() {
		let importContent = ""
		let defindContent = ""
		let funcContent = ""
		let url = path.join(__dirname, 'DataManager.txt')
		let clazData = fs.readFileSync(url, { encoding: "utf-8" })
		this.forEachSheet(sheet => {
			let name = sheet.name
			importContent += `import { ${name}Data } from "./ConfigTypeDefind"\n`
			defindContent += `    export let ${name}Datas: Array<${name}Data>\n`
			defindContent += `    export let ${name}DatasById: { [key in number]: ${name}Data }\n`
			funcContent += `        ${name}Datas = arrayData(${name}Data, "${name}", datas)\n`
			funcContent += `        ${name}DatasById = getsById(${name}Datas)\n`
		})
		//在这个三个位置替换字符串
		clazData = clazData.replace("@@import", importContent)
		clazData = clazData.replace("@@varDefined", defindContent)
		clazData = clazData.replace("@@funcContent", funcContent)
		//保存文件
		this.saveFile(clazData, "DataManager.ts")
	}
	/**
	 * 生成 data.json
	 */
	generateDatas() {
		let json = {}
		this.forEachSheet(sheet => {
			json[sheet.name] = {}
			let englishNames = sheet.data[1]
			let types = sheet.type
			//从第3行(下标为2)开始读取数据 生成数据对象
			for (let row = 2; row < sheet.data.length; row++) {
				let rowdatas = sheet.data[row]
				let id = rowdatas[0]
				if (id == null) {
					continue
				}
				if (typeof id !== 'number') {
					continue
				}
				//一行代表一个 data(数据对象) 
				let data = []
				//给这个 data(数据对象) 添加表里的属性 
				for (let i = 0; i < englishNames.length; i++) {
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
							let numbers = []
							String(value).split('|').forEach(v => {
								numbers.push(Number(v))
							})
							data.push(numbers)
							break;
						case 'Array<string>':
							data.push(value.split('|'))
							break;
					}
				}
				json[sheet.name][data[0]] = data
			}
		})
		this.saveFile(JSON.stringify(json), 'datas.json')
	}
}

module.exports = Excel
