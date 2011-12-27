package {
  import flash.events.Event;
  import flash.events.MouseEvent;
  import flash.net.FileReference;
  import flash.display.*;
  import flash.external.ExternalInterface;
  import com.dynamicflash.util.Base64;
  import flash.text.TextField;
  import flash.text.TextFormat;

  public class Save extends Sprite {
    private var file:FileReference = new FileReference();
    private var o:Object;

    public function Save() {
      flash.system.Security.allowDomain('*');

      var format:TextFormat = new TextFormat();
      format.size = 15;

      var txt:TextField = new TextField();
      txt.defaultTextFormat = format;
      txt.text = "SCARICA";
      addChild(txt);

      txt.border = true;
      txt.wordWrap = true;
      txt.x = 0;
      txt.y = 0;
      txt.width = 300;
      txt.height = 150;
      txt.background = true;
      txt.addEventListener(MouseEvent.CLICK, onMouseClickEvent);

      ExternalInterface.addCallback('setData', setData);
    }

    private function setData(data:Object):Boolean {
      o = data;
      return true;
    }

    protected function onMouseClickEvent(event:Event):void {
      if (o.dataType == "string" && o.data != "") {
        file.save(o.data, o.filename);
      } else if (o.dataType == "base64" && o.data) {
        file.save(Base64.decodeToByteArray(o.data), o.filename);
      }
      ExternalInterface.call("function(){var s=document.getElementById('downloads').style;s.zIndex= -99;s.visibility='hidden';document.getElementsByTagName('a')[0].focus();}");
    }
  }
}
