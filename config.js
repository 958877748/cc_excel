let fs = require('fs')
let path = require('path')

/**
 * 配置文件目录
 */
let configPath = path.join(__dirname, 'config.json')

class Config {
    /**
     * 字体保存路径,相对于项目的路径
     */
    FontSavePath = ''
}

/**
 * 配置管理
 */
class ConfigManager {
    /**
     * 是否是一个路径
     * @param {string} str
     */
    isPath(str) {
        if (str == null || str == '') {
            return false
        } else {
            return true
        }
    }
    /**
     * 是否存在路径
     * @param {string} str 
     */
    isHas(str) {
        try {
            fs.statSync(str)
            return true
        } catch {
            return false
        }
    }
    /**
     * 读取配置文件
     * @returns {Config}
     */
    read() {
        try {
            //配置文件文件存在
            fs.accessSync(configPath, fs.constants.F_OK)
            //读取
            let str = fs.readFileSync(configPath, "utf-8")
            //转对象  返回
            return JSON.parse(str)
        } catch (err) {
            //没有配置文件
            //新建一个 返回
            return new Config()
        }
    }
    /**
     * 保存配置文件
     * @param {Config} config
     */
    save(config) {
        let str = JSON.stringify(config)
        fs.writeFileSync(configPath, str, { encoding: 'utf-8' })
    }
}

module.exports = {
    configManager: new ConfigManager(),
    Config: Config
}
