require('dotenv').config();
const webpack = require('webpack');
const path = require('path');

const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => {

    const devMode = argv.mode !== "production";

    return {
        mode: devMode ? "development" : "production",
        entry: './web/themes/custom/' + process.env.THEME_NAME + '/index.js',
        output: {
            filename: 'main.js',
            path: path.resolve(__dirname, 'web', 'themes', 'custom', process.env.THEME_NAME, 'dist'),
        },
        devtool: false,
        module: {
            rules: [
                {
                    test: /\.mp3$/,
                    loader: 'file-loader'
                },
                {
                    test: /\.(sa|sc|c)ss$/i,
                    exclude: [/static/],
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader",
                            options: {
                                sourceMap: devMode ? true : false
                            },
                        },
                        {
                            loader: "sass-loader",
                            options: {
                                sourceMap: devMode ? true : false
                            },
                        },
                        {
                            loader: "postcss-loader",
                            options: {
                                sourceMap: devMode ? true : false
                            },
                        },
                    ],
                },
            ],
        },
        plugins: [
            new webpack.ProvidePlugin({
                $: 'jquery',
                jQuery: 'jquery',
            }),
            new webpack.SourceMapDevToolPlugin({}),
            new MiniCssExtractPlugin()
        ],
    }
}
