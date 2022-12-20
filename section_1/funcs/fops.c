#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>

int main(int argc, char **argv) {
    char * fname = "test.txt";
    char * p_legend = NULL;
    int fd = open(fname, O_RDWR | O_CREAT, 00600);
    int retval = 0;
    off_t seek_return;
    char buffer[80];

    if (fd < 0) {
        p_legend = fname;
        goto out;
    } else {
        printf("Flags used to open file: %o\n", O_RDWR | O_CREAT);
        for (int counter = 0; counter < 10; counter++) {
            if (write(fd, "data\n", 5) != 5) {
                p_legend = "On writing";
				goto out;
			}
        }

        if (seek_return = lseek(fd, 0, SEEK_SET) != 0) {
            p_legend = "On seeking";
            goto out;
        }
        
        for (int counter = 0; counter < 10; counter++) {
            memset(buffer, 0, 80);
            if (read(fd, buffer, 5) != 5) {
                p_legend = "On reading";
                goto out;
            }
            printf("%d %s", counter, buffer);
        }

out:    if (fd >= 0) {
            close(fd);
            if (unlink(fname)) {
                p_legend = "On unlinking";
            }
        }

        if (p_legend != NULL) {
            perror(p_legend);
            retval = 1;
        }
	}
    return retval;
}
