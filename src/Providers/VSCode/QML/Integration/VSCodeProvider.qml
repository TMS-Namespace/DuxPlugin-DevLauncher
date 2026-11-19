// VSCodeProvider.qml - The only QML entry point the plugin uses for VS Code; it supplies the VS Code reader component.
import ".."
import "../../../../Plugin/QML/Contracts"
import QtQml

ProviderBase {

    readerType: Component {
        VSCodeRecents {
        }

    }

}
