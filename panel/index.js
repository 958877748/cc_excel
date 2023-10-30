const fs = require('fs')
const path = require('path')
const { configManager } = require('../config')
const { showMessage, onClick, sendToMainjs, selectFilePath, readFileList, log, ProjectPath, selectFile } = require('../function')

try {
	const nodexlsx = require('node-xlsx')
} catch (error) {
	showMessage('please npm install !!!')
}

let number_fun = function (value) {
	if (value) {
		return Number(value)
	} else {
		return 0
	}
}
let string_fun = function (value) {
	if (value) {
		return value + ''
	} else {
		return ''
	}
}
let boolean_fun = function (value) {
	if (value === undefined) {
		return false
	} else {
		if (value)
			return true
		else
			return false
	}
}
let list_number_fun = function (value) {
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
let list_string_fun = function (value) {
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
/**
 * 自定义类型信息
 * @type {{[x:string]:{type:string,getValue:Function}}}
 */
let allTypeData = {
	'int': { type: 'number', getValue: number_fun },
	'list<int>': { type: 'Array<number>', getValue: list_number_fun },

	'float': { type: 'number', getValue: number_fun },
	'list<float>': { type: 'Array<number>', getValue: list_number_fun },

	'str': { type: 'string', getValue: string_fun },
	'string': { type: 'string', getValue: string_fun },
	'list<string>': { type: 'Array<string>', getValue: list_string_fun },

	'boo': { type: 'boolean', getValue: boolean_fun },
	'bool': { type: 'boolean', getValue: boolean_fun },
	'boolean': { type: 'boolean', getValue: boolean_fun }
}

/**
 * 解析所有excel文件
 * @param {string[]} xlsxPaths 所有excel文件路径列表
 * @returns 返回一个对象 对象的key为表名 value为解析后的对象
 */
function parseXlsx(xlsxPaths) {
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

function save_ConfigTypeDefind_ts(xlsxs, saveRoot) {
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
		let titles = sheet1.data[0]
		/** @type {string[]} */
		let vars = sheet1.data[1]
		/** @type {string[]} */
		let types = sheet1.data[2]

		//拼凑ts文件的字符串
		str += `export class ${xlsxName}Data extends Data{\n`
		//拼凑每一条属性
		let delect = 0
		for (let i = 1; i < types.length; i++) {
			/** 变量中文描述 */
			let cnName = titles[i]
			/** 变量英文名字 */
			let enName = vars[i]
			/** 变量类型 */
			let type = types[i]
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
				log('[未知类型]' + type, __filename)
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

function save_dataManager_ts(xlsxs, saveRoot) {
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

function save_datas_json(xlsxs, saveRoot) {
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
		//从第5行开始读取数据 生成数据对象
		a: for (let row = 5; row < sheetdata.length; row++) {
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

// 此文件名需要与在package.json中注册的文件名相同
// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({
	// 面板的css样式
	// css style for panel
	style: `
    :host { margin: 5px; }
    h2 { color: #f90; }
  `,

	// 面板的html模板
	// html template for panel
	template: `
    <h2>bitmap</h2>

	<div>字体保存路径:</div>
	<div><span id="FontSavePathLabel"></span></div>
	<ui-button id="SelectFontSavePathButton">选择字体保存路径</ui-button>
	<ui-button id="生成位图字体按钮" class="green">生成位图字体</ui-button>

	<hr />

	<h2>excel</h2>
	<div>JSON导出保存路径:</div>
	<div><span id="ExcelExportPathLabel"></span></div>
	<ui-button id="SelectExportPathButton">选择导出路径</ui-button>
	<ui-button id="ExportJsonButton" class="green">导出JSON</ui-button>
	
	<hr />
	<ui-button id="TiledSetButton">Tiled图集扩边</ui-button>
  `,

	// 元素和变量绑定
	// element and variable binding
	$: {
		FontSavePathLabel: '#FontSavePathLabel',
		SelectFontSavePathButton: '#SelectFontSavePathButton',
		生成位图字体按钮: '#生成位图字体按钮',

		/**
		 * [label]导出 json 的路径
		 */
		ExcelExportPathLabel: '#ExcelExportPathLabel',
		/**
		 * [button]选择导出 json 的路径 
		 */
		SelectExportPathButton: '#SelectExportPathButton',
		/**
		 * [button]执行导出 json
		 */
		ExportJsonButton: '#ExportJsonButton',
		/**
		 * [button]Tiled图集扩边按钮
		 */
		TiledSetButton: '#TiledSetButton',
	},

	// 当成功执行模板和方法时加载和方法
	// method executed when template and styles are successfully loaded and initialized
	ready() {

		//Tiled图集扩边
		onClick(this.$TiledSetButton, () => {
			//选择文件路径
			selectFile('选择Tiled图集', SelectPath => {
				log('选择Tiled图集 成功', SelectPath)
			})
		})

		/**
		 * 显示字体保存路径
		 */
		let showFontSavePath = () => {
			//读取配置
			let config = configManager.read()
			//配置是一个路径
			if (configManager.isPath(config.FontSavePath)) {
				//显示配置路径
				this.$FontSavePathLabel.innerText = config.FontSavePath
			} else {
				//显示未设置
				this.$FontSavePathLabel.innerText = '未设置'
			}
		}
		showFontSavePath()

		onClick(this.$SelectFontSavePathButton, () => {
			selectFilePath('选择字体保存路径', SelectPath => {

				let config = configManager.read()
				config.FontSavePath = path.relative(ProjectPath, SelectPath)
				configManager.save(config)

				log('保存成功', __filename)
				showFontSavePath()
			})
		})

		onClick(this.$生成位图字体按钮, () => {
			log('调用main.js中的 生成位图字体 方法', __filename)
			sendToMainjs('GenerateFont1')
		})

		onClick(this.$ExportJsonButton, () => {

			let saveRoot = ProjectPath + '/assets/data'
			let xlsxRoot = ProjectPath + '/excel'

			let xlsxPaths = readFileList(fs, xlsxRoot)
			let xlsxs = parseXlsx(xlsxPaths)

			save_ConfigTypeDefind_ts(xlsxs, saveRoot)

			save_dataManager_ts(xlsxs, saveRoot)

			save_datas_json(xlsxs, saveRoot)

			//刷新资源管理器
			Editor.assetdb.refresh('db://assets/data/')
		})
	},

	// 在此处注册你的ipc消息
	// register your ipc messages here
	messages: {
		'test'(event) {
			// this.$label.innerText = 'Hello!';
		}
	}
});