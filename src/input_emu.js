VideoFill = {
	SetOrigin : function(vDom)
	{
		this.dom = vDom
		this.originWidth = vDom.offsetWidth
		this.originHeight = window.innerHeight
		this.adjustWidth = this.originWidth
		this.videoDimension = [2560, 1440]  	// 输出分辨率 之后 根据登录返回信息 设置
	},
	SetReal:function(){
		if (!this.Adjust)
		{
			let w = this.dom.offsetWidth
			let h = this.dom.offsetHeight
			if (h > this.originHeight)
			{
				this.Adjust = true
				this.dom.style.height = this.originHeight + "px"
				this.dom.style.width = this.originWidth * this.originHeight / h + "px"
				this.adjustWidth = parseInt(this.originWidth * this.originHeight / h)
			}
		}
		
	}
}


KeyBoardState = {
	KeyPress : 1,
	KeyRelease : 0
}

ControllerType = {
	Keyboard : 0,
	KeyboardVK : 1,		//虚拟键盘
	MouseMove : 10,
	MouseButton : 11,
	MouseWheel : 12
}

MouseButtonMap = [
	1,	// kMouseButtonLeft 
	4,	// kMouseButtonMiddle
	2 	// kMouseButtonRight
]

function CreateUser(ws)
{
	var user = {}
	user.wsHandler = ws

	function wrtieUtfString(b, str, len)
	{
		len = len || str.length
		for (let i = 0; i < len; ++i) 
		{
			if (i >= str.length)
			{
				b.writeUnsignedByte(0)
			}
			else
			{
				b.writeUnsignedByte(str.charCodeAt(i))
			}
        }
	}

	user.transfromKeyCode = function(code)
	{
		if (this.isMacOs)
		{
			if (code == 91)
			{
				//window win button disabled
				return -1
			}
		}
		//fix vk code error in server
		return code
	}

	user.DoLogin = function(username, password){
		let packSize = 4 + 2 + 32 + 2 + 32
		let byteArray = new ByteBuffer(packSize)
		// 4 + 1 + username length + password length
		byteArray.writeUnsignedInt(68)
		byteArray.writeUnsignedByte(0)		//action
		byteArray.writeUnsignedByte(0)		//protocol
		wrtieUtfString(byteArray, username, 32)

		byteArray.writeUnsignedByte(6)		//verify type
		byteArray.writeUnsignedByte(0)		//verify size
		wrtieUtfString(byteArray, password, 32)

		this.wsHandler.send(byteArray.buffer)
	}

	user.sendInput = function(keyCode, pressType){
		//发送键盘事件 
		//package size 4 + clientConntrol 6 + ClientKeyBoard 4
		let packSize = 14
		let byteArray = new ByteBuffer(packSize)
		// 4 + 1 + username length + password length
		byteArray.writeUnsignedInt(10)
		byteArray.writeUnsignedByte(1)		//action controller 1
		byteArray.writeUnsignedByte(ControllerType.KeyboardVK)		//controller type keyboard 
		byteArray.writeUnsignedInt(Date.now())	//timestamp

		byteArray.writeUnsignedShort(keyCode)		//keycode
		byteArray.writeUnsignedByte(pressType)		//button state
		byteArray.writeByte(0)						//reserved

		this.wsHandler.send(byteArray.buffer)
	}

	user.sendInputMouse = function(x, y, button, pressType){
		//xy 转换 => 0 -- 65535
		// 除2 这边我也不理解 4k屏幕 2k分辨率的关系么？ 
		x = parseInt(x / VideoFill.adjustWidth  * 65535 / 2)
		y = parseInt(y / VideoFill.originHeight * 65535 / 2)


		//发送鼠标事件 
		let byteArray
		if (pressType == -1)
		{
			//mousemove
			//package size 4 + clientConntrol 6 + ClientMouseMove 4
			let packSize = 14
			byteArray = new ByteBuffer(packSize)
			// 4 + 1 + username length + password length
			byteArray.writeUnsignedInt(10)
			byteArray.writeUnsignedByte(1)		//action controller 1
			byteArray.writeUnsignedByte(ControllerType.MouseMove)		//controller type mousemove 
			byteArray.writeUnsignedInt(Date.now())	//timestamp

			byteArray.writeUnsignedShort(x)		//x
			byteArray.writeUnsignedShort(y)		//y
		}
		else
		{
			button = MouseButtonMap[button]
			//mouse click
			//package size 4 + clientConntrol 6 + ClientMouseMove 4
			let packSize = 16
			byteArray = new ByteBuffer(packSize)
			// 4 + 1 + username length + password length
			byteArray.writeUnsignedInt(12)
			byteArray.writeUnsignedByte(1)		//action controller 1
			byteArray.writeUnsignedByte(ControllerType.MouseButton)		//controller type mousemove 
			byteArray.writeUnsignedInt(Date.now())	//timestamp

			byteArray.writeUnsignedByte(button)		//which button
			byteArray.writeUnsignedByte(pressType)		//button state
			byteArray.writeUnsignedShort(x)		//x
			byteArray.writeUnsignedShort(y)		//y
		}
		//package size 4 + clienntConntrol 6 + ClientKeyBoard 4
					//reserved

		this.wsHandler.send(byteArray.buffer)
	}

	user.sendInputWheel = function(deltaX, deltaY){
		let packSize = 12
		let byteArray = new ByteBuffer(packSize)
		// 4 + 1 + username length + password length
		byteArray.writeUnsignedInt(8)
		byteArray.writeUnsignedByte(1)		//action controller 1
		byteArray.writeUnsignedByte(ControllerType.MouseWheel)		//controller type keyboard 
		byteArray.writeUnsignedInt(Date.now())	//timestamp

		byteArray.writeByte(deltaX)		//int8 dx
		byteArray.writeByte(deltaY)		//int8 dy

		this.wsHandler.send(byteArray.buffer)
	}

	user.AddInputListener = function(){
		this.isMacOs = navigator.userAgent.indexOf("Mac OS") != -1; 

	    var ownPtr = this
		document.onkeydown = function (event){  
	        var event = event || window.event;  
	        if (!event.repeat)
	        {
	        	console.log("key down " + event.key + " code:" + event.keyCode)

	        	let trsCode = ownPtr.transfromKeyCode(event.keyCode)
	        	if (trsCode == -1)
	        	{
	        		return
	        	}
	        	//发包
	        	ownPtr.sendInput(trsCode, KeyBoardState.KeyPress)
	        }
	        return false
	    }
	    document.onkeyup = function (event){
	        var event = event || window.event;
	        if (!event.repeat)
	        {
	        	console.log("key up " + event.key + " code:" + event.keyCode)
	        	let trsCode = ownPtr.transfromKeyCode(event.keyCode)
	        	if (trsCode == -1)
	        	{
	        		return
	        	}
	        	ownPtr.sendInput(trsCode, KeyBoardState.KeyRelease)
	        }
	        return false
	    }

	    function globalMove(evt)
	    {
	    	VideoFill.outerValueX += VideoFill.outStep
	    	ownPtr.sendInputMouse(VideoFill.outerValueX , event.offsetY, 0, -1)
	    } 


	    VideoFill.dom.onmouseout = function(event){
	    	var event = event || window.event;
	    	VideoFill.outStep = event.offsetX < 0 ? -2 : 2
	    	VideoFill.outerValueX = event.offsetX
	    	document.addEventListener("mousemove", globalMove)
	    }
	    VideoFill.dom.onmouseover = function(event){
	    	var event = event || window.event;
	    	VideoFill.outStep = 0
	    	document.removeEventListener("mousemove", globalMove)
	    }
	    VideoFill.dom.onmousemove = function(event){
	    	var event = event || window.event;
	    	ownPtr.sendInputMouse(event.offsetX , event.offsetY, 0, -1)
	    }
	    VideoFill.dom.onmousedown = function(event){
	    	console.log(event.button)
	    	var event = event || window.event;
	        if (!event.repeat)
	        {
		    	ownPtr.sendInputMouse(event.offsetX , event.offsetY, event.button, KeyBoardState.KeyPress)
	        }
	    }
	    VideoFill.dom.onmouseup = function(event){
	    	var event = event || window.event;
	        if (!event.repeat)
	        {
		    	ownPtr.sendInputMouse(event.offsetX , event.offsetY, event.button, KeyBoardState.KeyRelease)
	        }
	    }
	    VideoFill.dom.onmousewheel = function(event){
	    	var event = event || window.event;
	        ownPtr.sendInputWheel(-event.deltaX , -event.deltaY)
	    }
	}

	return user
}