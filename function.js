//工具函数
// const fs = require('fs') 这里无法使用fs 函数里使用的话 需要把fs当参数传进来
const path = require('path')

module.exports = {
    /**
     * 显示一个提示弹窗
     * @param {string} message 
     */
    showMessage: function (message) {
        Editor.Dialog.messageBox({ title: '提示', message: message })
    },

    /**
     * 按钮监听点击
     * @param {*} btn 
     * @param {Function} fun 
     */
    onClick: function (btn, fun) {
        btn.addEventListener('confirm', fun)
    },

    /**
     * 调用 main.js 中的 message 下的某方法
     * @param {string} message 方法名
     */
    sendToMainjs: function (message) {
        Editor.Ipc.sendToMain('bitmap:' + message)
    },

    /**
     * 调用某个面板的某个方法
     * @param {string} panelId 面板id
     * @param {string} functionName 方法名
     */
    sendToPanel: function (panelId, functionName) {
        Editor.Ipc.sendToPanel(panelId, functionName)
    },

    /**
     * 选择一个文件路径
     * @param {string} title 选择窗口标题
     * @param {(path: string) => void} select 选择后掉用
     * @param {Function} notSelect 未选择掉用
     */
    selectFilePath: function (title, select, notSelect) {
        let defaultPath = path.join(Editor.Project.path, 'assets')
        //选择文件夹路径
        let res = Editor.Dialog.openFile({
            title: title,
            defaultPath: defaultPath,
            properties: ['openDirectory'],
        })
        if (res !== -1) {
            select(res[0])
        } else {
            if (notSelect) notSelect()
        }
    },

    /**
     * 选择一个文件
     * @param {string} title 选择窗口标题
     * @param {(path: string) => void} select 选择后掉用
     * @param {Function} notSelect 未选择掉用
     */
    selectFile: function (title, select, notSelect) {
        let defaultPath = path.join(Editor.Project.path, 'assets')
        //选择文件夹路径
        let res = Editor.Dialog.openFile({
            title: title,
            defaultPath: defaultPath,
            properties: ['openFile'],
        })
        if (res !== -1) {
            select(res[0])
        } else {
            if (notSelect) notSelect()
        }
    },

    /**
     * 递归读取目录下所有文件
     * @param {*} fs 导入的fs模块
     * @param {string} dir 目录
     * @param {string[]} fileList 文件列表
     * @returns 文件列表
     */
    readFileList: function readFileList(fs, dir, fileList = []) {
        //读取一个目录下的所有文件/目录
        let files = fs.readdirSync(dir)
        files.forEach(file => {
            // 拼接为全路径 
            let fullPath = path.join(dir, file)
            let stats = fs.statSync(fullPath)
            //如果这是一个目录
            if (stats.isDirectory()) {
                //读取目录里的文件
                readFileList(fs, path.join(dir, file), fileList)
            } else {
                //这是一个文件,文件路径加入列表
                fileList.push(fullPath)
            }
        })
        return fileList
    },

    /**
     * 刷新资源
     * @param {string} assetsPath 
     */
    refreshAssets: function (assetsPath) {
        Editor.assetdb.refresh(assetsPath)
    },

    /**
     * 是否存在这个文件
     * @param {*} fs 导入的fs模块
     * @param {string} filePath 文件路径
     * @param {Function} has 存在时回调
     * @param {Function} not 不存在时回调
     */
    isHasFile: function (fs, filePath, has, not) {
        fs.access(filePath, fs.constants.F_OK, err => {
            if (err) {
                if (not) not()
            } else {
                has()
            }
        })
    },

    /**
     * 日志
     * @param {string} str 
     * @param {string} file __filename 文件路径
     */
    log: function (str, file) {
        Editor.log(str)
        if (file) Editor.log(`[Log]${file}`)
    },

    /**
     * 打开面板
     * @param {string} panelId 面板id
     */
    OpenPanel: function (panelId) {
        Editor.Panel.open(panelId)
    },

    /**
     * 当前项目路径
     * @type {string} tips: D:/project/name
     */
    ProjectPath: Editor.Project.path,
}