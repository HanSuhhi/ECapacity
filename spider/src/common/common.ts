export function print(input?) {
	if (input) {
		console.log(input);
	}
}

/**
 * @description 倒计时
 * @date 2020-06-28
 * @export
 * @param {number} input
 */
export function countSeconds(input: number) {
	let v = setInterval(() => {
		print(`倒计时${input--}秒`);
		if (input <= 0) {
			clearInterval(v);
		}
	}, 1000);
}
