import { print, countSeconds } from "../common/common";
import { taobaoCookies, yinghuochongCookies, darenjiCookies } from "./cookies";
import { log } from "util";
/**
 * 导包
 */
const fs = require("fs");
const puppteer = require("puppeteer");
const readline = require("readline");

interface IAnchorDataDarenji {
	// 主播名称
	anchor_name: string;
	// 最近直播日期
	start_date_nearly: string;
	// 当天直播观看次数
	life_watch: string;
	// 主播排名
	anchor_rank: string;
	// 直播点赞数
	live_like: string;
	// 粉丝变化
	fans_change: string;
	// 推荐商品总量
	recommend_pros: string;
	// 近30天直播次数
	nearly_live_times: string;
	// 总观看次数
	all_watch: string;
	// 总点赞量
	all_like: string;
}
interface IAnchor_history_detail {
	live_title: string;
	live_time: string;
	begin_time: string;
	live_labels: string;
	live_pv: string;
	live_uv: string;
	hour_uv: string;
	fans_change: string;
	live_likes: string;
}

/**
 * @description 爬虫
 * @date 2020-06-29
 * @export
 * @class Spider
 */
export class Spider {
	private darenji: string = "http://www.darenji.com/";
	private yinghuochong: string =
		"https://yihoc.com/data/mutationStar/starSearch";
	private alivrenwu: string =
		"https://v.taobao.com/v/content/live?spm=a21xh.11312869.fastEntry.2.75a8627fb2YoNw&catetype=701";
	private anchorNames: string[] = [];

	/**
	 *Creates an instance of Spider.
	 * @date 2020-06-28
	 * @param {string} searchName 搜索主播ID
	 */
	constructor(searchNames: string[]) {
		this.anchorNames = searchNames;
	}

	/**
	 * @description 暴露 启动方法
	 * @date 2020-07-15
	 */
	public start() {
		this.spider();
	}

	/**
	 * @description 爬虫启动
	 * @date 2020-07-15
	 * @private
	 * @param {string} [anchor=this.anchorName]
	 */
	private async spider(anchors: string[] = this.anchorNames) {
		// 根据名称创建文件夹
		await anchors.forEach((anchor) => {
			fs.exists(`./static/${anchor}`, (res) => {
				// 如果文件夹不存在，则创建子
				if (!res) {
					fs.mkdir(`./static/${anchor}`, (err) => {
						print(err);
					});
				}
			});
		});
		// // 保存直播数据
		// this.saveNearlyLive(anchors);
		// // 获取30日直播数据
		// this.saveHistoryData(anchors);
		// 获取主播报价及评价
		this.savaAnchorDetail(anchors);
	}
	/**
	 * @description 保存30天历史直播数据
	 * @date 2020-06-29
	 * @private
	 * @param {string[]} anchors
	 */
	private async saveHistoryData(anchors: string[]) {
		await this.getPageYinghuochong(anchors, this.yinghuochong)
			.then((answers) => {
				answers.map((ans) => {
					ans.splice(1, 0, "------------------------------");
				});
				return answers;
			})
			.then((answers) => {
				answers.forEach((ans) => {
					const anchor: string = ans.shift();
					const file: string = this.arr(ans);
					fs.writeFile(`./static/${anchor}/${anchor}_30日直播`, file, (err) => {
						print(err ? err : "");
					});
				});
			})
			.then(() => {
				print("30日直播数据爬取完成！");
			})
			.catch((err) => {
				print("30日数据爬取失败");
				print(err);
			});
	}

	/**
	 * @description 保存最近直播数据
	 * @date 2020-06-29
	 * @private
	 * @param {string[]} anchors
	 */
	private async saveNearlyLive(anchors: string[]) {
		await print("开始写入最近直播数据...");
		// 处理最近直播数据
		await this.getPageDarenji(anchors, this.darenji)
			.then((value) => {
				value = value.map((val: Array<string>) => {
					val.unshift("最近直播详情：");
					val.unshift("----------------------------");
					return val;
				});
				return value;
			})
			.then((value) => {
				value.forEach((val: Array<string>) => {
					const anchor: string = val.splice(2, 1)[0];
					const file: string = this.arr(val);
					fs.writeFile(`./static/${anchor}/${anchor}_直播数据`, file, (err) => {
						print(err ? err : "");
					});
				});
			})
			.then(() => {
				print("达人记爬取完成");
			})
			.catch((err) => {
				print("达人记爬取失败");
				print(err);
			});
	}

	/**
	 * @description 保存主播信息
	 * @date 2020-06-29
	 * @private
	 * @param {string[]} details
	 */
	private async savaAnchorDetail(details: string[]) {
		this.getPageAlivrenwu(details, this.alivrenwu)
			.then((values) => {
				values.forEach((val) => {
					const anchor = val.shift();
					const file: string = this.arr(val);
					fs.writeFile(
						`./static/${anchor}/${anchor}_主播个人数据`,
						file,
						(err) => {
							print(err ? err : "");
						}
					);
				});
			})
			.then(() => {
				print("主播信息保存完成");
			})
			.catch((err) => {
				print(`主播信息保存出错`);
				print(err);
			});
	}

	/**
	 * @description 数组处理方法 - 转化为字符串
	 * @date 2020-06-29
	 * @private
	 * @param {Array<string>} answer
	 * @returns {string}
	 */
	private arr(answer: Array<string>): string {
		// 数组处理
		let file: string = "";
		answer.forEach((val) => {
			file += val;
			file += `\n`;
		});
		return file;
	}

	/**
	 * @description 爬取达人记
	 * @date 2020-06-27
	 * @param {*} page_url
	 * @param {*} anchor_name
	 */
	private async getPageDarenji(
		anchor_names: string[],
		page_url: string
	): Promise<Array<Array<string>>> {
		let answers: Array<Array<string>> = [];
		const browser = await puppteer.launch();
		const page = await browser.newPage();
		await page.setCookie(...darenjiCookies);
		await page.goto(page_url);
		await page.waitFor(1000);

		for (let anchor_name of anchor_names) {
			let answer: Array<string> = [];
			await page.type("#sousuo", anchor_name, { delay: 100 });
			await page.click(".index_search_btn_zhubo");
			await page.waitFor(5000);

			await page.screenshot({ path: "./static/results/v.jpg", fullPage: true });

			await page.goto(page_url + "/search.html");

			const hasAnchor = await page.$("#nickname");
			if (!hasAnchor) {
				print(`达人记无${anchor_name}主播数据`);
				continue;
			}

			const url = await page.$eval("#nickname", (el) => {
				return el.attributes["href"].value;
			}); // 获取主播详情URL

			await page.goto(`http://www.darenji.com${url}`);

			const anchor: IAnchorDataDarenji = {
				// 主播名称
				anchor_name: anchor_name,
				// 最近直播日期
				start_date_nearly: await page.$eval(".wxDetail-tit h5", (el) => {
					return el.innerText.slice(0, 6);
				}),
				// 当天直播观看次数
				life_watch: await page.$eval(
					".col-xs-4:nth-child(1) div:nth-child(2) p:last-child",
					(el) => el.innerText
				),
				// 主播排名
				anchor_rank: await page.$eval(
					".col-xs-4:nth-child(3) div:nth-child(2) p:last-child",
					(el) => el.innerText
				),
				// 直播点赞数
				live_like: await page.$eval(
					".col-xs-4:nth-child(4) div:nth-child(2) p:last-child",
					(el) => el.innerText
				),
				// 粉丝变化
				fans_change: await page.$eval(
					".col-xs-4:nth-child(5) div:nth-child(2) p:last-child",
					(el) => el.innerText
				),
				// 推荐商品总量
				recommend_pros: await page.$eval(
					".col-xs-4:nth-child(6) div:nth-child(2) p:last-child",
					(el) => el.innerText
				),
				// 近30天直播次数
				nearly_live_times: await page.$eval(
					".platform-acc-info",
					(el) => el.children[0].children[0].innerText
				),
				// 总观看次数
				all_watch: await page.$eval(
					".platform-acc-info",
					(el) => el.children[1].children[0].innerText
				),
				// 总点赞量
				all_like: await page.$eval(
					".platform-acc-info",
					(el) => el.children[3].children[0].innerText
				),
			};

			// 控制台打印
			// await print(`查询主播：${anchor.anchor_name}`);
			// await print(`主播最近直播日期：${anchor.start_date_nearly}`);
			// await print(`当天直播观看次数：${anchor.life_watch}`);
			// await print(`主播排名：${anchor.anchor_rank}`);
			// await print(`直播点赞数：${anchor.live_like}`);
			// await print(`本次直播粉丝变化：${anchor.fans_change}`);
			// await print(`推荐商品种类：${anchor.recommend_pros}`);

			await answer.push(`${anchor.anchor_name}`);
			await answer.push(`查询主播： ${anchor.anchor_name}`);
			await answer.push(`主播最近直播日期：${anchor.start_date_nearly}`);
			await answer.push(`当天直播观看次数：${anchor.life_watch}`);
			await answer.push(`主播排名：${anchor.anchor_rank}`);
			await answer.push(`直播点赞数：${anchor.live_like}`);
			await answer.push(`本次直播粉丝变化：${anchor.fans_change}`);
			await answer.push(`推荐商品种类：${anchor.recommend_pros}`);

			answers.push(answer);
		}
		await browser.close();

		return await answers;
	}

	/**
	 * @description 爬取萤火虫
	 * @date 2020-06-28
	 * @private
	 * @param {string} anchor_name
	 * @param {string} page_url
	 * @returns
	 */
	private async getPageYinghuochong(
		anchor_names: string[],
		page_url: string
	): Promise<Array<Array<string>>> {
		let answers: Array<Array<string>> = [];
		const browser = await puppteer.launch();
		const page = await browser.newPage();
		await page.goto(page_url);
		await page.waitFor(1000);

		await page.screenshot({
			path: "./static/results/QR.jpg",
			fullPage: true,
		});
		await print("5s内完成扫码");

		await page.waitFor(10000);

		for (let anchor_name of anchor_names) {
			let answer: Array<string> = [];
			await page.goto(page_url);
			await page.waitFor(1000);
			// await page.screenshot({ path: "./static/results/v.jpg", fullPage: true });

			await page.type(".el-input__inner", anchor_name, {
				delay: 100,
			});

			await page.click(".el-input-group__append");
			await page.waitFor(2000);

			await page.click("tbody > tr > td:last-child > div > span");

			await page.waitFor(1000);

			/**
			 * 进入目标网页
			 */
			const fans = await page.$eval(".footer-fans-count", (el) => {
				return el.innerText;
			});
			await answer.push(`粉丝总量: ${fans}`);

			// 获得主播近30场直播数据
			await page.click(".star-data-title > div > span");
			await answer.push("--------------------------");
			await answer.push("近30场直播数据:");
			await page.waitFor(1000);
			await page.click(".el-dropdown-menu__item:nth-child(4)");
			for (let i = 1; i <= 6; i++) {
				const title = await page.$eval(
					`.star-data-wrap > :nth-child(${i}) > :nth-child(1)`,
					(el) => {
						return el.innerText;
					}
				);
				const det = await page.$eval(
					`.star-data-wrap > :nth-child(${i}) > :nth-child(2)`,
					(el) => {
						return el.innerText;
					}
				);
				await answer.push(`${title}: ${det}`);
			}

			// 获取主播30场场次详情
			await page.click(".is-top:last-child > span");
			await page.waitFor(5000);

			for (let i = 1; i <= 30; i++) {
				answer.push("---------------");
				answer.push(
					// 开播时间
					`${await page.$eval(
						`.el-table__row:nth-child(${i}) div:nth-child(2) > :nth-child(3)`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`房间名称: ${await page.$eval(
						`.el-table__row:nth-child(${i}) div:nth-child(2) > :nth-child(1)`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`${await page.$eval(
						`.el-table__row:nth-child(${i}) div:nth-child(2) > :nth-child(2)`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`直播标签：${await page.$eval(
						`.el-table__row:nth-child(${i}) > :nth-child(3)`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`直播PV： ${await page.$eval(
						`.el-table__row:nth-child(1) > :nth-child(4) span`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`直播uv: ${await page.$eval(
						`.el-table__row:nth-child(1) > :nth-child(5) span`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`直播每小时uv: ${await page.$eval(
						`.el-table__row:nth-child(1) > :nth-child(6) span`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`涨粉量： ${await page.$eval(
						`.el-table__row:nth-child(1) > :nth-child(7) span`,
						(el) => el.innerText
					)}`
				);
				answer.push(
					`点赞量： ${await page.$eval(
						`.el-table__row:nth-child(1) > :nth-child(8) span`,
						(el) => el.innerText
					)}`
				);
			}
			answer.unshift(anchor_name);
			answers.push(answer);
		}
		/**
		 * 关闭服务
		 */
		print("萤火虫爬取完成");
		await browser.close();
		return await answers;
	}

	/**
	 * @description 爬取阿里v任务
	 * @date 2020-06-29
	 * @private
	 * @param {string[]} anchor_names
	 * @param {string} page_url
	 * @returns
	 */
	private async getPageAlivrenwu(
		anchor_names: string[],
		page_url: string
	): Promise<Array<Array<string>>> {
		const browser = await puppteer.launch({
			handless: false,
		});
		const page = await browser.newPage();
		await page.setUserAgent(
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"
		);
		await page.setCookie(...taobaoCookies);
		let answers: Array<Array<string>> = [];
		for (let anchor_name of anchor_names) {
			let answer: Array<string> = [];

			await page.goto(page_url);
			await page.waitFor(1000);

			await page.type(".next-search-lt-input input", anchor_name);
			await page.click(".next-search-rt");

			await page.waitFor(3000);

			const url = await page.$eval(
				".anchor-profile-info",
				(el) => el.attributes["href"].value
			);
			await page.goto(`https://v.taobao.com${url}`);

			await page.waitFor(2000);

			// 获取粉丝分析图
			await page.setViewport({ width: 880, height: 1500 });

			let body = await page.$(".v3-home-tab-content:nth-child(3)");
			await body.screenshot({
				path: `./static/${anchor_name}/分析图.png`,
			});

			// 主播相关信息
			const hasMore = await page.$("v3-home-panel-footer a");
			if (hasMore) {
				await page.click(".v3-home-panel-footer a");
			}

			await answer.push(
				`淘宝综合能力指数:${await page.$eval(".num", (el) => el.innerText)}`
			);
			await answer.push(
				`主播服务类型: ${await page.$eval(".v3vcom", (el) => el.innerText)}`
			);
			await answer.push(
				`主播所属机构: ${await page.$eval(".media", (el) => el.innerText)}`
			);
			await answer.push(
				`接单率：${await page.$eval(
					".abilitydata:nth-child(4) > div:nth-child(1) > div",
					(el) => el.innerText
				)}`
			);
			await answer.push(
				`响应时间：${await page.$eval(
					".abilitydata:nth-child(4) > div:nth-child(2) > div",
					(el) => el.innerText
				)}`
			);
			await answer.push(
				`订单完成率：${await page.$eval(
					".abilitydata:nth-child(4) > div:nth-child(3) > div",
					(el) => el.innerText
				)}`
			);
			// 服务效果
			await answer.push("服务效果数据：");
			await answer.push(
				`服务评分：${await page.$eval(
					".abilitydata:nth-child(8) > div:nth-child(1) > div",
					(el) => el.innerText
				)}`
			);
			await answer.push(
				`服务用户数：${await page.$eval(
					".abilitydata:nth-child(8) > div:nth-child(2) > div",
					(el) => el.innerText
				)}`
			);
			await answer.push(
				`服务数量：${await page.$eval(
					".abilitydata:nth-child(8) > div:nth-child(3) > div",
					(el) => el.innerText
				)}`
			);
			await answer.push("--------");
			await answer.push("主播简介： ");
			await answer.push(
				`${await page.$eval(".ice-editor-preview-react", (el) => el.innerText)}`
			);
			await answer.push("--------");

			const products_nums: number = await page.$eval(
				".v3-service-list",
				(el) => el.children.length
			);
			// 服务报价
			await answer.push("--------");
			await answer.push("商品报价：");
			for (let i = 1; i <= products_nums; i++) {
				await answer.push(`报价${i}： `);
				await answer.push(
					`${await page.$eval(
						".v3-service-item:nth-child(" + i + ")",
						(el) => el.innerText
					)}`
				);
				await answer.push("--------");
			}

			// 7日内容互动数据
			await answer.push(`主播7日内容互动数据`);
			await answer.push(`
				内容发布数：${await page.$eval(
					".db-about:nth-child(2) > div:nth-child(1) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				内容引导入店数：${await page.$eval(
					".db-about:nth-child(2) > div:nth-child(2) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				图文浏览量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(1) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				直播观看量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(2) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				短视频播放量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(3) > div",
					(el) => el.innerText
				)}
			`);

			// 30日内容互动数据
			await answer.push(`主播30日内容互动数据`);
			await page.click(".db-title > span:nth-child(2)");
			await page.waitFor(1000);
			await page.click(".ver li:nth-child(2)");
			await page.waitFor(1000);
			await answer.push(`
				内容发布数：${await page.$eval(
					".db-about:nth-child(2) > div:nth-child(1) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				内容引导入店数：${await page.$eval(
					".db-about:nth-child(2) > div:nth-child(2) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				图文浏览量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(1) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				直播观看量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(2) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				短视频播放量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(3) > div",
					(el) => el.innerText
				)}
			`);
			// 90日内容互动数据
			await answer.push(`主播90日内容互动数据`);
			await page.click(".db-title > span:nth-child(2)");
			await page.click(".ver li:nth-child(3)");
			await page.waitFor(1000);
			await answer.push(`
				内容发布数：${await page.$eval(
					".db-about:nth-child(2) > div:nth-child(1) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				内容引导入店数：${await page.$eval(
					".db-about:nth-child(2) > div:nth-child(2) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				图文浏览量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(1) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				直播观看量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(2) > div",
					(el) => el.innerText
				)}
			`);
			await answer.push(`
				短视频播放量：${await page.$eval(
					".db-about:nth-child(3) > div:nth-child(3) > div",
					(el) => el.innerText
				)}
			`);
			answer.unshift(`${anchor_name}`);
			answers.push(answer);
			// 爬取评论
			await this.getAnchorCommends(page, anchor_name);
		}
		await browser.close();
		return answers;
	}

	/**
	 * @description 因为功能相对独立于爬取主播数据，且保存为独一文件
	 * 不与主文件共享保存，单独成func
	 * @date 2020-06-29
	 * @private
	 */
	private async getAnchorCommends(page, anchor_name: string) {
		let pages: any = await page.$eval(
			".v3-home-tab-content:nth-child(5) .next-pagination-pages .next-pagination-display",
			(el) => el.innerText
		);
		pages = Number(await pages.slice(pages.indexOf("/") + 1));
		let commend_nums: number = 1;
		let answers: string[] = [];

		A: for (let i = 1; i <= pages; i++) {
			for (let j = 1; j <= 6; j++) {
				await answers.push(`第${commend_nums++}条评论：`);
				await answers.push(
					`客户名称: ${await page.$eval(
						".next-table-row:nth-child(" + j + ") > td:nth-child(1)",
						(el) => el.innerText
					)}`
				);
				await answers.push(
					`服务类型: ${await page.$eval(
						".next-table-row:nth-child(" + j + ") > td:nth-child(2)",
						(el) => el.innerText
					)}`
				);
				// answers.push(
				// 	`星级: ${await page.$eval(
				// 		".next-table-row:nth-child(" + j + ") > div:nth-child(4)"
				// 	)}`
				// );
				await answers.push(
					`评价时间: ${await page.$eval(
						".next-table-row:nth-child(" + j + ") > td:nth-child(5)",
						(el) => el.innerText
					)}`
				);
				await answers.push(
					`评价内容: ${await page.$eval(
						".next-table-row:nth-child(" + j + ") > td:nth-child(6)",
						(el) => el.innerText
					)}`
				);
				await answers.push("-----------------");
				if (j + 1 <= 6) {
					const hasNextCommend = await page.$(
						".next-table-row:nth-child(" + (j + 1) + ") > td:nth-child(1)"
					);
					if (!hasNextCommend) {
						break A;
					}
				}
			}
			await page.click(
				".v3-home-tab-content:nth-child(5) .next-pagination-pages button:nth-child(3)"
			);
			await page.waitFor(1000);
		}

		const file: string = this.arr(answers);
		fs.writeFile(
			`./static/${anchor_name}/${anchor_name}_主播服务评价_共${--commend_nums}条`,
			file,
			(err) => {
				print(err ? err : "");
			}
		);
	}
}
