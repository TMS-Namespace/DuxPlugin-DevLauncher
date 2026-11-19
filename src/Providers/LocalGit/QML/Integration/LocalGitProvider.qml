// LocalGitProvider.qml - The only QML entry point the plugin uses for the local Git folder source; it supplies the reader component.
import ".."
import "../../../../Plugin/QML/Contracts"
import QtQml

ProviderBase {

    readerType: Component {
        LocalGitRecents {
        }

    }

}
