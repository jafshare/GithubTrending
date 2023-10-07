module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es6: true
  },
  extends: [
    // import排序插件
    "plugin:import/recommended",
    "@antfu/eslint-config-ts",
    "prettier",
    "plugin:prettier/recommended"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": ["off"], // ts 定义数据类型为any不报错
    "@typescript-eslint/ban-types": [
      // 解决空对象报错
      "error",
      {
        extendDefaults: true,
        types: {
          "{}": false
        }
      }
    ],
    "no-empty": "off", // catch finally语句块报错
    "no-empty-function": "off", // 关闭空函数报错
    "no-console": "off", // 关闭console的报错
    "no-async-promise-executor": "off", // 取消Promise的executor的Promise
    "@typescript-eslint/no-empty-function": ["off"],
    "@typescript-eslint/no-var-requires": "off", // require报错
    "@typescript-eslint/ban-ts-comment": "off", // 禁用@ts-ignore等指令的报错
    "antfu/if-newline": "off",
    // @antfu/eslint-config-vue 默认禁用，如果需要开启，需要下载对应的别名解析库 vite: eslint-import-resolver-vite 、webpack: eslint-import-resolver-typescript
    // "import/no-unresolved": "error",
    // import之后默认增加换行
    "import/newline-after-import": ["error", { "count": 1 }],
    // import排序配置
    "import/order": [
      "error",
      {
        // 对导入模块进行分组，分组排序规则如下
        groups: [
          "builtin", // 内置模块
          "external", // 外部模块
          [
            "parent", //父节点依赖
            "sibling" //兄弟依赖
          ],
          "internal", //内部引用
          "index", // index文件
          "type", //类型文件
          "unknown"
        ],
        //通过路径自定义分组
        pathGroups: [
          {
            pattern: "@/**", // 把@开头的应用放在external分组后面
            group: "external",
            position: "after"
          }
        ],
        // 是否开启独特组，用于区分自定义规则分组和其他规则分组
        distinctGroup: true,
        // 每个分组之间换行
        "newlines-between": "always",
        // 相同分组排列规则 按字母升序排序
        alphabetize: { order: "asc" }
      }
    ]
  }
};
