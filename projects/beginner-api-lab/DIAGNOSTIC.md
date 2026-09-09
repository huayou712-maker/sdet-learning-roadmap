# 入门诊断：先证明你能独立做

不设耗时门槛。可以查语法，记录查了什么；首次作答先不用 AI 代写。环境跑通是工具检查，下面的独立作答才用于判断下一步学什么。

## D1：函数、列表与字典

在本目录新建你自己的 practice_summary.py，编写 summarize(rows)。输入是合成测试结果列表，每条是包含 name 与 status 的字典；status 只允许 passed / failed。返回统计字典，例如：

~~~python
summarize([
    {"name": "register", "status": "passed"},
    {"name": "underage", "status": "failed"},
    {"name": "duplicate", "status": "passed"},
])
# 必须返回 {"total": 3, "passed": 2, "failed": 1}

summarize([])
# 必须返回 {"total": 0, "passed": 0, "failed": 0}
~~~

遇到缺少 status 或不支持的状态应抛 ValueError；不要改变输入列表或字典。写出自己的测试，放 tests/test_summary_practice.py，覆盖上述 4 类输入及输入未被修改。

~~~powershell
.\.venv\Scripts\python.exe -m pytest tests/test_summary_practice.py -q
~~~

解释：循环变量是什么？字典怎样计数？return 和 print 有何区别？为什么失败状态不能直接忽略？空输入为什么不能除以 0？

## D2：读懂失败

把一条期望值临时改错，运行单条测试，指出文件、行号、预期与实际。再恢复正确断言并重跑；把这次失败记录写入自己的复盘。不能只贴一张“绿色通过”截图。

## D3：环境与 Git

解释 python -m pytest 为什么能确定使用哪个环境。用 git status、git branch --show-current、git diff 查看自己的改动；先检查没有凭据、个人资料、venv 或缓存，再把自己的代码与诊断记录提交 GitHub，不操作正式学习数据副本。

## 分流

- D1 无法起步：先补变量、条件、循环、函数、list / dict 与异常，再重做 D1。
- D1 会写，D2 不会：先练断言与 traceback，完成一次可复现排错。
- D3 卡住：先解决环境 / 路径 / 分支；不要继续安装整套框架。
- 三项都能独立解释：进入 README 的注册接口用例设计，再做 EXERCISES.md。

提交物：自己的代码、测试、命令结果摘要、遇到的 1 个具体问题。示例代码通过不算诊断通过。
