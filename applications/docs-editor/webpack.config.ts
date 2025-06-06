import { DefinePlugin, type Configuration } from 'webpack'
import { config as dotenvConfig } from 'dotenv'
import path from 'node:path'
dotenvConfig({ path: path.join(__dirname, '.env') })

import getConfig from '@proton/pack/webpack.config'
import { addDevEntry } from '@proton/pack/webpack/entries'

const result = (env: any): Configuration => {
  const config = getConfig(env)
  config.plugins?.push(
    new DefinePlugin({
      'process.env.DOCS_SHEETS_KEY': JSON.stringify(process.env.DOCS_SHEETS_KEY),
    }),
  )
  if (env.appMode === 'standalone') {
    addDevEntry(config)
  }
  // @ts-ignore
  const scssRule = config.module.rules.find((rule) => rule.test.toString().includes('scss'))
  // @ts-ignore
  const postCssLoader = scssRule.use.find((use) => use.loader.includes('postcss-loader'))
  // @ts-ignore
  postCssLoader.options.postcssOptions.plugins.push(require('tailwindcss')())
  return config
}

export default result
