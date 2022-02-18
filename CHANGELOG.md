# [2.2.0](https://github.com/matrix-org/matrix-files-sdk/compare/v2.1.1...v2.2.0) (2022-02-18)


### Features

* add logging support via log4js ([a52e43a](https://github.com/matrix-org/matrix-files-sdk/commit/a52e43ace6a60cde1da2cbfcae5046d52c68978f))

## [2.1.1](https://github.com/matrix-org/matrix-files-sdk/compare/v2.1.0...v2.1.1) (2022-02-14)


### Bug Fixes

* top-level is writable for folders ([30743b2](https://github.com/matrix-org/matrix-files-sdk/commit/30743b22c4bee729a4fc5463267970e0910beaf5))

# [2.1.0](https://github.com/matrix-org/matrix-files-sdk/compare/v2.0.5...v2.1.0) (2022-02-14)


### Features

* add IEntry.writable and IFolderMembership.canWrite ([7debecc](https://github.com/matrix-org/matrix-files-sdk/commit/7debeccf3ff640169737c3f66a6d2ab308982efa))

## [2.0.5](https://github.com/matrix-org/matrix-files-sdk/compare/v2.0.4...v2.0.5) (2022-02-11)


### Bug Fixes

* export IMatrixFiles ([05a8000](https://github.com/matrix-org/matrix-files-sdk/commit/05a800049f511f9eaace4c16bff19ad1df3f5d96))

## [2.0.4](https://github.com/matrix-org/matrix-files-sdk/compare/v2.0.3...v2.0.4) (2022-02-11)


### Bug Fixes

* correctly handle case of unknown last modified date on folder ([67eb982](https://github.com/matrix-org/matrix-files-sdk/commit/67eb982335361cd040cb1d4fd4c4a8c116d4bc8b))

## [2.0.3](https://github.com/matrix-org/matrix-files-sdk/compare/v2.0.2...v2.0.3) (2022-02-07)


### Bug Fixes

* get version history more reliably ([7294e19](https://github.com/matrix-org/matrix-files-sdk/commit/7294e19d0b944077862abe4ea485c650a10ccfea))

## [2.0.2](https://github.com/matrix-org/matrix-files-sdk/compare/v2.0.1...v2.0.2) (2022-02-07)


### Bug Fixes

* emit modified event when child room changes name ([5f69f88](https://github.com/matrix-org/matrix-files-sdk/commit/5f69f88efb65f60d9f36aa764aab552a2cef9117))

## [2.0.1](https://github.com/matrix-org/matrix-files-sdk/compare/v2.0.0...v2.0.1) (2022-02-07)


### Bug Fixes

* include class diagram in npm ([96a3d45](https://github.com/matrix-org/matrix-files-sdk/commit/96a3d456ee29805d44d44abbe3aa3dcb30888c55))

# [2.0.0](https://github.com/matrix-org/matrix-files-sdk/compare/v1.5.0...v2.0.0) (2022-02-06)


### Features

* removed all deprecated functions/properties ([b7bd1a6](https://github.com/matrix-org/matrix-files-sdk/commit/b7bd1a657bd1552ce9693df92dbf267a05c5dbea))


### BREAKING CHANGES

* removed all deprecated functions/properties

# [1.5.0](https://github.com/matrix-org/matrix-files-sdk/compare/v1.4.0...v1.5.0) (2022-02-06)


### Features

* cleanup interfaces exposed by SDK and deprecate old names ([#3](https://github.com/matrix-org/matrix-files-sdk/issues/3)) ([2188799](https://github.com/matrix-org/matrix-files-sdk/commit/21887995a3940ba8e7cdf03b635076dba762445b))

# [1.4.0](https://github.com/matrix-org/matrix-files-sdk/compare/v1.3.0...v1.4.0) (2022-02-05)


### Features

* add inline documentation for public Interface classes ([f160a27](https://github.com/matrix-org/matrix-files-sdk/commit/f160a273419133447433b99be3d3e78e1e9f9be2))

# [1.3.0](https://github.com/matrix-org/matrix-files-sdk/compare/v1.2.0...v1.3.0) (2022-02-05)


### Features

* expose IMatrixFiles interface ([ad2a85e](https://github.com/matrix-org/matrix-files-sdk/commit/ad2a85e80cc479b86eba82d02441ed4d1b7f9d30))

# [1.2.0](https://github.com/matrix-org/matrix-files-sdk/compare/v1.1.4...v1.2.0) (2022-01-31)


### Features

* optimise moveTo() to rename() where possible ([6f48822](https://github.com/matrix-org/matrix-files-sdk/commit/6f48822265bece993e870b30390c857be949e7c9))

## [1.1.4](https://github.com/matrix-org/matrix-files-sdk/compare/v1.1.3...v1.1.4) (2022-01-29)


### Bug Fixes

* **deps:** revert workaround for matrix-encrypt-attachment not working from npmjs ([2a5b3ef](https://github.com/matrix-org/matrix-files-sdk/commit/2a5b3ef2fa410325a5311e639b3b717a49bdfed2))

## [1.1.3](https://github.com/matrix-org/matrix-files-sdk/compare/v1.1.2...v1.1.3) (2022-01-17)


### Bug Fixes

* use release version of matrix-js-sdk instead of rc ([0345dbf](https://github.com/matrix-org/matrix-files-sdk/commit/0345dbf0fbfb1903a0d8cdec0dbb6fdd6757c2b8))

## [1.1.2](https://github.com/matrix-org/matrix-files-sdk/compare/v1.1.1...v1.1.2) (2022-01-17)


### Bug Fixes

* actually return the stored mimetype in getBlob() ([417edb8](https://github.com/matrix-org/matrix-files-sdk/commit/417edb8fd63ecfb203183b1c0784ed1e471eb608))

## [1.1.1](https://github.com/matrix-org/matrix-files-sdk/compare/v1.1.0...v1.1.1) (2022-01-17)


### Bug Fixes

* export ArrayBufferBlob type ([7bbbac2](https://github.com/matrix-org/matrix-files-sdk/commit/7bbbac2cfd2a0847def628552cb6b897e429a413))

# [1.1.0](https://github.com/matrix-org/matrix-files-sdk/compare/v1.0.3...v1.1.0) (2022-01-17)


### Features

* return raw mimetype and rely on SDK consumer to take care of any XSS issues ([2d9ab63](https://github.com/matrix-org/matrix-files-sdk/commit/2d9ab6387f2abf9ff88c77cbd867c95ffc7feb4a))

## [1.0.3](https://github.com/matrix-org/matrix-files-sdk/compare/v1.0.2...v1.0.3) (2022-01-17)


### Bug Fixes

* correct return type of IEntry.getParent() ([48e282a](https://github.com/matrix-org/matrix-files-sdk/commit/48e282a4ce83fbbb2bcef892e07caf8522986e43))

## [1.0.2](https://github.com/matrix-org/matrix-files-sdk/compare/v1.0.1...v1.0.2) (2022-01-16)


### Bug Fixes

* reduce npm package size and exclude source/build files ([69577a4](https://github.com/matrix-org/matrix-files-sdk/commit/69577a428eae33ec430273b7e0519674b8ac426e))

## [1.0.1](https://github.com/matrix-org/matrix-files-sdk/compare/v1.0.0...v1.0.1) (2022-01-15)


### Bug Fixes

* fixed up changelog ([c8e4f0e](https://github.com/matrix-org/matrix-files-sdk/commit/c8e4f0e1b5bd95d6c8428aab6fb1002736373eae))

# 1.0.0 (2022-01-15)


### Features

* first iteration of file system like abstraction over MatrixClient ([12185f8](https://github.com/matrix-org/matrix-files-sdk/commit/12185f8d34c937141a1a21343421655a655b7726))
