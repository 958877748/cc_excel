'use strict'

const { createCipheriv } = require('crypto')
const fs = require('fs')
const path = require('path')
const { configManager } = require('./config')
const { showMessage, refreshAssets, isHasFile, log, ProjectPath, readFileList, OpenPanel, sendToPanel } = require('./function')

module.exports = {
	load() {
		// execute when package loaded
	},

	unload() {
		// execute when package unloaded
	},

	// register your ipc messages here
	// 在这儿注册你的 ipc 消息
	// 收到对应的ipc消息后 就会调用对应方法
	messages: {
		//在 package.json 中 main-menu 字段中定义 bitmap/open
		'OpenPanel'() {
			// open entry panel registered in package.json
			// 打开一个注册在 package.json 中的面板
			// 打开 package.json 中 panel.custom 这个定义
			OpenPanel('bitmap.tool')
		},

		'GenerateFont'() {
			let language = 'vn'
			let ctrlPath = '越南-VN'

			let ImagePath = path.join(__dirname, ctrlPath)

			// 读取目录下的所有文件列表
			let FilesList = readFileList(fs, ImagePath)

			let lastpng = `-${language}.png`
			let lastjpg = `-${language}.jpg`
			FilesList.forEach(v => {

				if (path.extname(v) == '.png' && !v.includes(lastpng)) {
					let fileName = path.basename(v).split('.')[0]
					let newName = path.dirname(v) + '\\' + fileName + lastpng
					fs.rename(v, newName, (err) => {
						if (err) {
							log(err)
							return
						}
						log('文件重命名成功')
					})
				}

				if (path.extname(v) == '.jpg' && !v.includes(lastjpg)) {
					let fileName = path.basename(v).split('.')[0]
					let newName = path.dirname(v) + '\\' + fileName + lastjpg
					fs.rename(v, newName, (err) => {
						if (err) {
							log(err)
							return
						}
						log('文件重命名成功')
					})
				}

			})

		},

		'GenerateFont1'() {
			// 插件加载后在项目根目录自动创建指定文件夹
			// fs.mkdirSync(path.join(Editor.Project.path+'/assets/', 'myNewFolder'));
			// Editor.success('New folder created!');

			//读取配置文件
			let config = configManager.read()
			let FontSavePath = path.join(ProjectPath, config.FontSavePath)
			if (!configManager.isPath(FontSavePath)) {
				showMessage('未配置字体保存路径')
				return
			}

			//判断路径所对应的文件夹是否存在
			if (!configManager.isHas(FontSavePath)) {
				showMessage('无效字体保存路径')
				return
			}

			/** assets绝对路径 */
			let AssetsPath = path.join(ProjectPath, 'assets')

			// 读取assets目录下的所有文件列表
			let AssetsFilesList = readFileList(fs, AssetsPath)

			//需要的文件的后缀名
			let NeedExtname = ['.fire', '.prefab', '.ts', '.json']

			let strarray = [' ']
			AssetsFilesList.forEach(FilePath => {

				//获取文件路径的后缀名
				let Extname = path.extname(FilePath)

				//这个文件的后缀名是需要的后缀名
				if (NeedExtname.includes(Extname)) {

					//读取文件字符串
					let FileString = fs.readFileSync(FilePath, "utf-8")
					//分割为单个字符串
					let array = FileString.split('')
					//将strarray中没有的字符串加入strarray
					array.forEach(s => {
						if (!strarray.includes(s)) {
							strarray.push(s)
						}
					})
				}
			})

			//删除换行符
			// let index = strarray.indexOf('\n')
			// if (index > -1) {
			// 	strarray.splice(index, 1)
			// }

			//拼接字符串
			let zfc = strarray.join('')

			log('拼接字符串')

			// 写入文件
			/** 当前去重字符文件路径 */
			let charFontFilePath = path.resolve(__dirname, './font.txt')
			
			fs.writeFileSync(charFontFilePath, zfc, { encoding: 'utf16le' })
			/** bat的路径 */
			let batPath = path.join(__dirname, 'run.bat')

			//启动子线程,运行run.bat,并将当前目录作为参数传递
			let childProcess = require('child_process')
			childProcess.execSync(`start ${batPath} ${__dirname} ${FontSavePath}`)

			log('__dirname', __dirname)
			log('FontSavePath', FontSavePath)

			//刷新资源管理器
			//找到相对路径
			/** 刷新资源的基础路径 */
			let baseRefreshPath = 'db://' + path.relative(ProjectPath, FontSavePath)
			//转换其他斜杠到这个 / 斜杠
			baseRefreshPath = baseRefreshPath.split(path.sep).join('/')

			//刷新fnt
			refreshAssets(baseRefreshPath + '/bmp.fnt')

			//刷新png
			{
				let index = 0
				let fileName = 'bmp_' + index + '.png'
				let filePath = path.join(FontSavePath, fileName)
				let hasRefresh = () => {
					isHasFile(fs, filePath, () => {
						//刷新这个资源
						refreshAssets(baseRefreshPath + '/' + fileName)
						//查看下一个资源
						index++
						fileName = 'bmp_' + index + '.png'
						filePath = path.join(FontSavePath, fileName)
						//有就刷新
						hasRefresh()
					}, () => {
						log('完成', __filename)
					})
				}
				hasRefresh()
			}
		}
	}
};